-- Migration: Create centralized application event logging
-- Purpose: Capture auth/search/cart/checkout/account/admin events with 180-day retention
-- Notes:
-- - We log account_number and email_address snapshots (no FK) to align with existing accounts_lcmd usage
-- - Inserts happen via a SECURITY DEFINER DB function or Edge Function with service_role
-- - Read access restricted to service_role via RLS policy
-- - Retention via pg_cron if available (best effort), otherwise no-op

BEGIN;

-- 1) Create enum for event types (idempotent)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE t.typname = 'event_type' AND n.nspname = 'public'
  ) THEN
    CREATE TYPE public.event_type AS ENUM (
      'auth.login_success',
      'auth.login_failure',
      'auth.session_expired',
      'search.keyword',
      'search.nav_tree',
      'cart.item_added',
      'cart.item_removed',
      'cart.cart_view',
      'cart.cart_abandoned',
      'checkout.started',
      'checkout.completed',
      'checkout.failed',
      'checkout.canceled',
      'account.password_changed',
      'account.admin_password_changed',
      'account.password_set_to_default_zip',
      'admin.action_performed',
      'other.custom'
    );
    COMMENT ON TYPE public.event_type IS 'Application event types';
  END IF;
END;
$$;

-- 2) Main events table (append-only)
CREATE TABLE IF NOT EXISTS public.app_events (
  id              BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  occurred_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  event_type      public.event_type NOT NULL,
  -- Identity snapshots (no FK)
  account_number  INTEGER NULL,        -- aligns with accounts_lcmd.account_number
  email_address   TEXT NULL,           -- snapshot of email at time of event
  -- Correlation/context
  session_id      UUID NULL,
  request_id      UUID NULL,
  ip              INET NULL,
  user_agent      TEXT NULL,
  path            TEXT NULL,
  referrer        TEXT NULL,
  -- Flexible details
  metadata        JSONB NOT NULL DEFAULT '{}'::jsonb,
  -- Source
  created_by      TEXT NULL DEFAULT 'edge', -- 'edge' | 'frontend' | 'backend' | etc
  is_internal     BOOLEAN NOT NULL DEFAULT FALSE
);

COMMENT ON TABLE public.app_events IS 'Central append-only application events log';
COMMENT ON COLUMN public.app_events.account_number IS 'Snapshot of account_number at time of event (if known)';
COMMENT ON COLUMN public.app_events.email_address IS 'Snapshot of email at time of event';

-- 3) Indexes for common query paths
CREATE INDEX IF NOT EXISTS idx_app_events_occurred_at ON public.app_events (occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_app_events_event_type ON public.app_events (event_type);
CREATE INDEX IF NOT EXISTS idx_app_events_account_time ON public.app_events (account_number, occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_app_events_session ON public.app_events (session_id);
CREATE INDEX IF NOT EXISTS idx_app_events_request ON public.app_events (request_id);
CREATE INDEX IF NOT EXISTS idx_app_events_metadata_gin ON public.app_events USING GIN (metadata jsonb_path_ops);

-- 4) RLS: restrict access to service_role only (Edge Functions / server code)
ALTER TABLE public.app_events ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  -- Drop if exists to make idempotent
  IF EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'app_events' AND policyname = 'service_role_all'
  ) THEN
    EXECUTE 'DROP POLICY service_role_all ON public.app_events';
  END IF;

  EXECUTE $pol$
    CREATE POLICY service_role_all ON public.app_events
      USING ((auth.jwt() ->> 'role') = 'service_role')
      WITH CHECK ((auth.jwt() ->> 'role') = 'service_role');
  $pol$;
END;
$$;

-- 5) Logging helper function
CREATE OR REPLACE FUNCTION public.log_event(
  p_event_type     public.event_type,
  p_account_number INTEGER DEFAULT NULL,
  p_email_address  TEXT DEFAULT NULL,
  p_session_id     UUID DEFAULT NULL,
  p_request_id     UUID DEFAULT NULL,
  p_ip             INET DEFAULT NULL,
  p_user_agent     TEXT DEFAULT NULL,
  p_path           TEXT DEFAULT NULL,
  p_referrer       TEXT DEFAULT NULL,
  p_metadata       JSONB DEFAULT '{}'::jsonb,
  p_created_by     TEXT DEFAULT 'edge',
  p_is_internal    BOOLEAN DEFAULT FALSE
) RETURNS BIGINT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id BIGINT;
BEGIN
  INSERT INTO public.app_events (
    event_type,
    account_number,
    email_address,
    session_id,
    request_id,
    ip,
    user_agent,
    path,
    referrer,
    metadata,
    created_by,
    is_internal
  ) VALUES (
    p_event_type,
    p_account_number,
    p_email_address,
    p_session_id,
    p_request_id,
    p_ip,
    p_user_agent,
    p_path,
    p_referrer,
    COALESCE(p_metadata, '{}'::jsonb),
    COALESCE(p_created_by, 'edge'),
    COALESCE(p_is_internal, FALSE)
  ) RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

-- Restrict execution to service_role only
REVOKE ALL ON FUNCTION public.log_event(public.event_type, INTEGER, TEXT, UUID, UUID, INET, TEXT, TEXT, TEXT, JSONB, TEXT, BOOLEAN) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.log_event(public.event_type, INTEGER, TEXT, UUID, UUID, INET, TEXT, TEXT, TEXT, JSONB, TEXT, BOOLEAN) TO service_role;

-- 6) Retention: best-effort pg_cron scheduling (safe no-op if not available)
-- Try to create extension in 'extensions' schema (Supabase convention), then schedule a daily purge at 02:10.
-- If pg_cron isn't available, the DO block will swallow the error and continue.
DO $$
BEGIN
  BEGIN
    EXECUTE 'CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA extensions';
  EXCEPTION WHEN OTHERS THEN
    -- ignore if not allowed
    NULL;
  END;

  BEGIN
    -- Attempt to schedule; if pg_cron isn't installed or schedule already exists, ignore
    PERFORM 1;
    -- Avoid duplicate job: try to insert only if the job name isn't present
    IF EXISTS (SELECT 1 FROM pg_catalog.pg_namespace WHERE nspname = 'cron') THEN
      -- cron.job table exists in 'cron' schema
      IF NOT EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'purge_app_events_daily') THEN
        PERFORM cron.schedule(
          'purge_app_events_daily',
          '10 2 * * *',
          'DELETE FROM public.app_events WHERE occurred_at < NOW() - INTERVAL ''180 days'';'
        );
      END IF;
    ELSIF EXISTS (SELECT 1 FROM pg_catalog.pg_namespace WHERE nspname = 'extensions') THEN
      -- Some stacks place extension objects under 'extensions'
      IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'extensions' AND table_name = 'job') THEN
        IF NOT EXISTS (SELECT 1 FROM extensions.job WHERE jobname = 'purge_app_events_daily') THEN
          PERFORM extensions.cron.schedule(
            'purge_app_events_daily',
            '10 2 * * *',
            'DELETE FROM public.app_events WHERE occurred_at < NOW() - INTERVAL ''180 days'';'
          );
        END IF;
      ELSE
        -- Fallback: just try namespaced schedule call
        PERFORM extensions.cron.schedule(
          'purge_app_events_daily',
          '10 2 * * *',
          'DELETE FROM public.app_events WHERE occurred_at < NOW() - INTERVAL ''180 days'';'
        );
      END IF;
    END IF;
  EXCEPTION WHEN undefined_schema OR undefined_table OR undefined_function THEN
    -- pg_cron not available; skip scheduling
    NULL;
  END;
END;
$$;

COMMIT;
