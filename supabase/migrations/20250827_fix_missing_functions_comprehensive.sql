-- Comprehensive fix for missing RPC functions and tables
-- This addresses all 404 and related API errors

BEGIN;

-- =====================================
-- FIRST: Create missing tables if they don't exist
-- =====================================

-- Create app_events table if missing (needed for get_system_logs)
CREATE TABLE IF NOT EXISTS public.app_events (
  id BIGSERIAL PRIMARY KEY,
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  event_type TEXT NOT NULL,
  account_number INTEGER,
  email_address TEXT,
  session_id UUID,
  request_id UUID,
  ip INET,
  user_agent TEXT,
  path TEXT,
  referrer TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_by TEXT DEFAULT 'system',
  is_internal BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create cart_activity table if missing (needed for get_cart_activity_admin)
CREATE TABLE IF NOT EXISTS public.cart_activity (
  id SERIAL PRIMARY KEY,
  account_number INTEGER NOT NULL,
  product_code VARCHAR(50) NOT NULL,
  action VARCHAR(20) NOT NULL CHECK (action IN ('add', 'remove', 'update', 'clear')),
  quantity INTEGER NOT NULL DEFAULT 0,
  old_quantity INTEGER,
  activity_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  session_id VARCHAR(100),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create product_views table if missing (needed for get_shopping_activity_admin)
CREATE TABLE IF NOT EXISTS public.product_views (
  id SERIAL PRIMARY KEY,
  account_number INTEGER NOT NULL,
  product_code VARCHAR(50) NOT NULL,
  viewed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  page_url TEXT,
  session_id VARCHAR(100),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create SMS failures tracking table
CREATE TABLE IF NOT EXISTS public.sms_failures (
  id SERIAL PRIMARY KEY,
  account_number INTEGER,
  phone_number VARCHAR(20),
  message_type VARCHAR(50),
  error_code VARCHAR(20),
  error_message TEXT,
  failed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  retry_count INTEGER DEFAULT 0,
  last_retry_at TIMESTAMPTZ,
  resolved BOOLEAN DEFAULT false,
  resolved_at TIMESTAMPTZ
);

-- Create system configuration table
CREATE TABLE IF NOT EXISTS public.system_config (
  id SERIAL PRIMARY KEY,
  config_key VARCHAR(100) NOT NULL UNIQUE,
  config_value JSONB,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  updated_by INTEGER -- account_number
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_app_events_occurred_at ON public.app_events(occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_app_events_account_number ON public.app_events(account_number);
CREATE INDEX IF NOT EXISTS idx_app_events_event_type ON public.app_events(event_type);

CREATE INDEX IF NOT EXISTS idx_cart_activity_account_number ON public.cart_activity(account_number);
CREATE INDEX IF NOT EXISTS idx_cart_activity_activity_at ON public.cart_activity(activity_at DESC);

CREATE INDEX IF NOT EXISTS idx_product_views_account_number ON public.product_views(account_number);
CREATE INDEX IF NOT EXISTS idx_product_views_viewed_at ON public.product_views(viewed_at DESC);

CREATE INDEX IF NOT EXISTS idx_sms_failures_account_number ON public.sms_failures(account_number);
CREATE INDEX IF NOT EXISTS idx_sms_failures_failed_at ON public.sms_failures(failed_at DESC);

-- =====================================
-- SYSTEM LOG FUNCTIONS
-- =====================================

-- Function to get system logs for admin
CREATE OR REPLACE FUNCTION public.get_system_logs(
  p_start_date TIMESTAMPTZ DEFAULT NULL,
  p_end_date TIMESTAMPTZ DEFAULT NULL,
  p_event_types TEXT[] DEFAULT NULL,
  p_search_string TEXT DEFAULT NULL,
  p_account_number INTEGER DEFAULT NULL,
  p_limit INTEGER DEFAULT 100,
  p_offset INTEGER DEFAULT 0
) RETURNS TABLE (
  id BIGINT,
  occurred_at TIMESTAMPTZ,
  event_type TEXT,
  account_number INTEGER,
  email_address TEXT,
  session_id UUID,
  request_id UUID,
  ip INET,
  user_agent TEXT,
  path TEXT,
  referrer TEXT,
  metadata JSONB,
  created_by TEXT,
  is_internal BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only allow admin account 999
  IF current_setting('app.current_account_number')::INTEGER != 999 THEN
    RAISE EXCEPTION 'Access denied. Admin privileges required.';
  END IF;

  RETURN QUERY
  SELECT 
    ae.id,
    ae.occurred_at,
    ae.event_type,
    ae.account_number,
    ae.email_address,
    ae.session_id,
    ae.request_id,
    ae.ip,
    ae.user_agent,
    ae.path,
    ae.referrer,
    ae.metadata,
    ae.created_by,
    ae.is_internal
  FROM public.app_events ae
  WHERE 
    (p_start_date IS NULL OR ae.occurred_at >= p_start_date) AND
    (p_end_date IS NULL OR ae.occurred_at <= p_end_date) AND
    (p_event_types IS NULL OR ae.event_type = ANY(p_event_types)) AND
    (p_search_string IS NULL OR (
      ae.metadata::TEXT ILIKE '%' || p_search_string || '%' OR
      ae.path ILIKE '%' || p_search_string || '%' OR
      ae.referrer ILIKE '%' || p_search_string || '%' OR
      ae.user_agent ILIKE '%' || p_search_string || '%' OR
      ae.email_address ILIKE '%' || p_search_string || '%'
    )) AND
    (p_account_number IS NULL OR ae.account_number = p_account_number)
  ORDER BY ae.occurred_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$;

-- Function to get cart activity for admin
CREATE OR REPLACE FUNCTION public.get_cart_activity_admin(
  p_start_date TIMESTAMPTZ DEFAULT NULL,
  p_end_date TIMESTAMPTZ DEFAULT NULL,
  p_account_number INTEGER DEFAULT NULL,
  p_limit INTEGER DEFAULT 100,
  p_offset INTEGER DEFAULT 0
) RETURNS TABLE (
  id INTEGER,
  account_number INTEGER,
  product_code VARCHAR(50),
  action VARCHAR(20),
  quantity INTEGER,
  old_quantity INTEGER,
  activity_at TIMESTAMPTZ,
  session_id VARCHAR(100)
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only allow admin account 999
  IF current_setting('app.current_account_number')::INTEGER != 999 THEN
    RAISE EXCEPTION 'Access denied. Admin privileges required.';
  END IF;

  RETURN QUERY
  SELECT 
    ca.id,
    ca.account_number,
    ca.product_code,
    ca.action,
    ca.quantity,
    ca.old_quantity,
    ca.activity_at,
    ca.session_id
  FROM public.cart_activity ca
  WHERE 
    (p_start_date IS NULL OR ca.activity_at >= p_start_date) AND
    (p_end_date IS NULL OR ca.activity_at <= p_end_date) AND
    (p_account_number IS NULL OR ca.account_number = p_account_number)
  ORDER BY ca.activity_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$;

-- Function to get all cart contents (admin only)
CREATE OR REPLACE FUNCTION public.get_all_cart_contents()
RETURNS TABLE (
  account_number INTEGER,
  email_address TEXT,
  cart_contents JSONB,
  last_updated TIMESTAMPTZ,
  total_items INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only allow admin account 999
  IF current_setting('app.current_account_number')::INTEGER != 999 THEN
    RAISE EXCEPTION 'Access denied. Admin privileges required.';
  END IF;

  RETURN QUERY
  WITH latest_cart_activity AS (
    SELECT 
      ca.account_number,
      ca.product_code,
      ca.quantity,
      ca.activity_at,
      ROW_NUMBER() OVER (PARTITION BY ca.account_number, ca.product_code ORDER BY ca.activity_at DESC) as rn
    FROM public.cart_activity ca
    WHERE ca.action != 'remove' OR ca.quantity > 0
  ),
  current_carts AS (
    SELECT 
      lca.account_number,
      jsonb_object_agg(lca.product_code, jsonb_build_object(
        'quantity', lca.quantity,
        'last_updated', lca.activity_at
      )) as cart_contents,
      MAX(lca.activity_at) as last_updated,
      SUM(lca.quantity) as total_items
    FROM latest_cart_activity lca
    WHERE lca.rn = 1 AND lca.quantity > 0
    GROUP BY lca.account_number
  )
  SELECT 
    cc.account_number,
    acc.email_address,
    cc.cart_contents,
    cc.last_updated,
    cc.total_items::INTEGER
  FROM current_carts cc
  LEFT JOIN public.accounts_lcmd acc ON cc.account_number = acc.account_number
  WHERE cc.total_items > 0
  ORDER BY cc.last_updated DESC;
END;
$$;

-- =====================================
-- CONFIGURATION MANAGEMENT FUNCTIONS
-- =====================================

-- Function to set system configuration
CREATE OR REPLACE FUNCTION public.set_config(
  p_config_key TEXT,
  p_config_value JSONB,
  p_description TEXT DEFAULT NULL
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_account_number INTEGER;
  result JSONB;
BEGIN
  -- Get current account number
  v_account_number := current_setting('app.current_account_number')::INTEGER;
  
  -- Only allow admin account 999
  IF v_account_number != 999 THEN
    RAISE EXCEPTION 'Access denied. Admin privileges required.';
  END IF;

  -- Insert or update configuration
  INSERT INTO public.system_config (config_key, config_value, description, updated_by, updated_at)
  VALUES (p_config_key, p_config_value, p_description, v_account_number, NOW())
  ON CONFLICT (config_key) 
  DO UPDATE SET 
    config_value = EXCLUDED.config_value,
    description = COALESCE(EXCLUDED.description, system_config.description),
    updated_by = EXCLUDED.updated_by,
    updated_at = EXCLUDED.updated_at;

  -- Return success response
  result := jsonb_build_object(
    'success', true,
    'config_key', p_config_key,
    'config_value', p_config_value,
    'updated_at', NOW()
  );

  RETURN result;
END;
$$;

-- Function to get system configuration
CREATE OR REPLACE FUNCTION public.get_config(
  p_config_key TEXT DEFAULT NULL
) RETURNS TABLE (
  config_key TEXT,
  config_value JSONB,
  description TEXT,
  updated_at TIMESTAMPTZ,
  updated_by INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only allow admin account 999
  IF current_setting('app.current_account_number')::INTEGER != 999 THEN
    RAISE EXCEPTION 'Access denied. Admin privileges required.';
  END IF;

  RETURN QUERY
  SELECT 
    sc.config_key::TEXT,
    sc.config_value,
    sc.description,
    sc.updated_at,
    sc.updated_by
  FROM public.system_config sc
  WHERE (p_config_key IS NULL OR sc.config_key = p_config_key)
  ORDER BY sc.config_key;
END;
$$;

-- =====================================
-- SMS FAILURE TRACKING FUNCTIONS
-- =====================================

-- Function to log SMS failures
CREATE OR REPLACE FUNCTION public.log_sms_failure(
  p_account_number INTEGER,
  p_phone_number TEXT,
  p_message_type TEXT,
  p_error_code TEXT,
  p_error_message TEXT
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  failure_id INTEGER;
  result JSONB;
BEGIN
  -- Insert SMS failure record
  INSERT INTO public.sms_failures (
    account_number, 
    phone_number, 
    message_type, 
    error_code, 
    error_message,
    failed_at
  )
  VALUES (
    p_account_number,
    p_phone_number,
    p_message_type,
    p_error_code,
    p_error_message,
    NOW()
  )
  RETURNING id INTO failure_id;

  -- Return success response
  result := jsonb_build_object(
    'success', true,
    'failure_id', failure_id,
    'logged_at', NOW()
  );

  RETURN result;
END;
$$;

-- Function to get SMS failures (admin only)
CREATE OR REPLACE FUNCTION public.get_sms_failures(
  p_start_date TIMESTAMPTZ DEFAULT NULL,
  p_end_date TIMESTAMPTZ DEFAULT NULL,
  p_account_number INTEGER DEFAULT NULL,
  p_resolved BOOLEAN DEFAULT NULL,
  p_limit INTEGER DEFAULT 100
) RETURNS TABLE (
  id INTEGER,
  account_number INTEGER,
  phone_number TEXT,
  message_type TEXT,
  error_code TEXT,
  error_message TEXT,
  failed_at TIMESTAMPTZ,
  retry_count INTEGER,
  last_retry_at TIMESTAMPTZ,
  resolved BOOLEAN,
  resolved_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only allow admin account 999
  IF current_setting('app.current_account_number')::INTEGER != 999 THEN
    RAISE EXCEPTION 'Access denied. Admin privileges required.';
  END IF;

  RETURN QUERY
  SELECT 
    sf.id,
    sf.account_number,
    sf.phone_number::TEXT,
    sf.message_type::TEXT,
    sf.error_code::TEXT,
    sf.error_message,
    sf.failed_at,
    sf.retry_count,
    sf.last_retry_at,
    sf.resolved,
    sf.resolved_at
  FROM public.sms_failures sf
  WHERE 
    (p_start_date IS NULL OR sf.failed_at >= p_start_date) AND
    (p_end_date IS NULL OR sf.failed_at <= p_end_date) AND
    (p_account_number IS NULL OR sf.account_number = p_account_number) AND
    (p_resolved IS NULL OR sf.resolved = p_resolved)
  ORDER BY sf.failed_at DESC
  LIMIT p_limit;
END;
$$;

-- =====================================
-- GRANT PERMISSIONS
-- =====================================

-- Grant execute permissions to authenticated users
-- (Functions have their own security checks)
GRANT EXECUTE ON FUNCTION public.get_system_logs(TIMESTAMPTZ, TIMESTAMPTZ, TEXT[], TEXT, INTEGER, INTEGER, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_cart_activity_admin(TIMESTAMPTZ, TIMESTAMPTZ, INTEGER, INTEGER, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_all_cart_contents() TO authenticated;
GRANT EXECUTE ON FUNCTION public.set_config(TEXT, JSONB, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_config(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.log_sms_failure(INTEGER, TEXT, TEXT, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_sms_failures(TIMESTAMPTZ, TIMESTAMPTZ, INTEGER, BOOLEAN, INTEGER) TO authenticated;

-- Grant table permissions for service role (for edge functions)
GRANT ALL ON public.app_events TO service_role;
GRANT ALL ON public.cart_activity TO service_role;
GRANT ALL ON public.product_views TO service_role;
GRANT ALL ON public.sms_failures TO service_role;
GRANT ALL ON public.system_config TO service_role;

-- Grant sequence permissions
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO service_role;

-- Enable RLS on new tables
ALTER TABLE public.app_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cart_activity ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_views ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sms_failures ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_config ENABLE ROW LEVEL SECURITY;

-- Create RLS policies (restrictive by default, functions bypass RLS with SECURITY DEFINER)
CREATE POLICY "Admin only access" ON public.app_events FOR ALL USING (false);
CREATE POLICY "Admin only access" ON public.cart_activity FOR ALL USING (false);
CREATE POLICY "Admin only access" ON public.product_views FOR ALL USING (false);
CREATE POLICY "Admin only access" ON public.sms_failures FOR ALL USING (false);
CREATE POLICY "Admin only access" ON public.system_config FOR ALL USING (false);

-- Allow service role to bypass RLS (for edge functions)
CREATE POLICY "Service role full access" ON public.app_events FOR ALL TO service_role USING (true);
CREATE POLICY "Service role full access" ON public.cart_activity FOR ALL TO service_role USING (true);
CREATE POLICY "Service role full access" ON public.product_views FOR ALL TO service_role USING (true);
CREATE POLICY "Service role full access" ON public.sms_failures FOR ALL TO service_role USING (true);
CREATE POLICY "Service role full access" ON public.system_config FOR ALL TO service_role USING (true);

COMMIT;
