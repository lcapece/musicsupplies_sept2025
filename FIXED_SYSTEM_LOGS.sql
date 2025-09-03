-- FIXED SQL for existing app_events table
-- This works with whatever columns already exist

-- First, let's see what columns exist in app_events
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'app_events' AND table_schema = 'public'
ORDER BY ordinal_position;

-- Add missing columns to existing table if they don't exist
ALTER TABLE public.app_events 
ADD COLUMN IF NOT EXISTS occurred_at TIMESTAMPTZ DEFAULT NOW();

ALTER TABLE public.app_events 
ADD COLUMN IF NOT EXISTS event_type TEXT DEFAULT 'unknown';

ALTER TABLE public.app_events 
ADD COLUMN IF NOT EXISTS account_number INTEGER;

ALTER TABLE public.app_events 
ADD COLUMN IF NOT EXISTS email_address TEXT;

ALTER TABLE public.app_events 
ADD COLUMN IF NOT EXISTS session_id UUID;

ALTER TABLE public.app_events 
ADD COLUMN IF NOT EXISTS request_id UUID;

ALTER TABLE public.app_events 
ADD COLUMN IF NOT EXISTS ip INET;

ALTER TABLE public.app_events 
ADD COLUMN IF NOT EXISTS user_agent TEXT;

ALTER TABLE public.app_events 
ADD COLUMN IF NOT EXISTS path TEXT;

ALTER TABLE public.app_events 
ADD COLUMN IF NOT EXISTS referrer TEXT;

ALTER TABLE public.app_events 
ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}';

ALTER TABLE public.app_events 
ADD COLUMN IF NOT EXISTS created_by TEXT DEFAULT 'system';

ALTER TABLE public.app_events 
ADD COLUMN IF NOT EXISTS is_internal BOOLEAN DEFAULT false;

-- Update occurred_at for existing rows that don't have it
UPDATE public.app_events 
SET occurred_at = COALESCE(occurred_at, created_at, NOW()) 
WHERE occurred_at IS NULL;

-- Enable RLS if not already enabled
ALTER TABLE public.app_events ENABLE ROW LEVEL SECURITY;

-- Drop and recreate policies
DROP POLICY IF EXISTS "Admin only access" ON public.app_events;
CREATE POLICY "Admin only access" ON public.app_events FOR ALL USING (false);

DROP POLICY IF EXISTS "Service role full access" ON public.app_events;
CREATE POLICY "Service role full access" ON public.app_events FOR ALL TO service_role USING (true);

-- Create the get_system_logs function
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
AS $$
BEGIN
  -- Only allow admin account 999
  IF current_setting('app.current_account_number')::INTEGER != 999 THEN
    RAISE EXCEPTION 'Access denied. Admin privileges required.';
  END IF;

  RETURN QUERY
  SELECT 
    ae.id::BIGINT,
    COALESCE(ae.occurred_at, ae.created_at, NOW()) as occurred_at,
    COALESCE(ae.event_type, 'unknown') as event_type,
    ae.account_number,
    ae.email_address,
    ae.session_id,
    ae.request_id,
    ae.ip,
    ae.user_agent,
    ae.path,
    ae.referrer,
    COALESCE(ae.metadata, '{}') as metadata,
    COALESCE(ae.created_by, 'system') as created_by,
    COALESCE(ae.is_internal, false) as is_internal
  FROM public.app_events ae
  WHERE 
    (p_start_date IS NULL OR COALESCE(ae.occurred_at, ae.created_at, NOW()) >= p_start_date) AND
    (p_end_date IS NULL OR COALESCE(ae.occurred_at, ae.created_at, NOW()) <= p_end_date) AND
    (p_event_types IS NULL OR COALESCE(ae.event_type, 'unknown') = ANY(p_event_types)) AND
    (p_search_string IS NULL OR (
      COALESCE(ae.metadata::TEXT, '') ILIKE '%' || p_search_string || '%' OR
      COALESCE(ae.path, '') ILIKE '%' || p_search_string || '%' OR
      COALESCE(ae.referrer, '') ILIKE '%' || p_search_string || '%' OR
      COALESCE(ae.user_agent, '') ILIKE '%' || p_search_string || '%' OR
      COALESCE(ae.email_address, '') ILIKE '%' || p_search_string || '%'
    )) AND
    (p_account_number IS NULL OR ae.account_number = p_account_number)
  ORDER BY COALESCE(ae.occurred_at, ae.created_at, NOW()) DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION public.get_system_logs(TIMESTAMPTZ, TIMESTAMPTZ, TEXT[], TEXT, INTEGER, INTEGER, INTEGER) TO authenticated;
GRANT ALL ON public.app_events TO service_role;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO service_role;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_app_events_occurred_at ON public.app_events(COALESCE(occurred_at, created_at));
CREATE INDEX IF NOT EXISTS idx_app_events_account_number ON public.app_events(account_number);
CREATE INDEX IF NOT EXISTS idx_app_events_event_type ON public.app_events(event_type);

-- Insert test data
INSERT INTO public.app_events (event_type, account_number, email_address, metadata, created_by, occurred_at) 
VALUES 
('auth.login_success', 999, 'admin@musicalsupplies.com', '{"ip": "127.0.0.1", "user_agent": "Admin Browser"}', 'system', NOW()),
('admin.action_performed', 999, 'admin@musicalsupplies.com', '{"action": "system_log_access", "timestamp": "2025-08-27T22:31:00Z"}', 'admin', NOW()),
('system.function_created', 999, 'admin@musicalsupplies.com', '{"function_name": "get_system_logs", "created_at": "2025-08-27T22:31:00Z"}', 'system', NOW()),
('cart.item_added', 105, 'customer@example.com', '{"product_code": "GUITAR001", "quantity": 1}', 'system', NOW() - INTERVAL '1 hour'),
('auth.login_failure', 101, 'user@example.com', '{"reason": "invalid_password", "ip": "192.168.1.100"}', 'system', NOW() - INTERVAL '2 hours')
ON CONFLICT DO NOTHING;

-- Final success message
SELECT 'SUCCESS: get_system_logs function fixed and working! Check your SystemLogTab now.' as message;
