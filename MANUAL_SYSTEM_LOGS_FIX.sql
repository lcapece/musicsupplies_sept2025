-- EMERGENCY FIX FOR SYSTEM LOGS 404 ERRORS
-- Copy and paste this entire SQL into Supabase Dashboard > SQL Editor > Run

-- Step 1: Create the app_events table
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
  metadata JSONB DEFAULT '{}',
  created_by TEXT DEFAULT 'system',
  is_internal BOOLEAN DEFAULT false
);

-- Step 2: Enable Row Level Security
ALTER TABLE public.app_events ENABLE ROW LEVEL SECURITY;

-- Step 3: Create RLS policies
DROP POLICY IF EXISTS "Admin only access" ON public.app_events;
CREATE POLICY "Admin only access" ON public.app_events FOR ALL USING (false);

DROP POLICY IF EXISTS "Service role full access" ON public.app_events;
CREATE POLICY "Service role full access" ON public.app_events FOR ALL TO service_role USING (true);

-- Step 4: Create the get_system_logs function
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

-- Step 5: Grant permissions
GRANT EXECUTE ON FUNCTION public.get_system_logs(TIMESTAMPTZ, TIMESTAMPTZ, TEXT[], TEXT, INTEGER, INTEGER, INTEGER) TO authenticated;
GRANT ALL ON public.app_events TO service_role;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO service_role;

-- Step 6: Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_app_events_occurred_at ON public.app_events(occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_app_events_account_number ON public.app_events(account_number);
CREATE INDEX IF NOT EXISTS idx_app_events_event_type ON public.app_events(event_type);

-- Step 7: Insert test data so you see something in the logs
INSERT INTO public.app_events (event_type, account_number, email_address, metadata, created_by) 
VALUES 
('auth.login_success', 999, 'admin@musicalsupplies.com', '{"ip": "127.0.0.1", "user_agent": "Admin Browser"}', 'system'),
('admin.action_performed', 999, 'admin@musicalsupplies.com', '{"action": "system_log_access", "timestamp": "2025-08-27T22:09:00Z"}', 'admin'),
('system.function_created', 999, 'admin@musicalsupplies.com', '{"function_name": "get_system_logs", "created_at": "2025-08-27T22:09:00Z"}', 'system'),
('cart.item_added', 105, 'customer@example.com', '{"product_code": "GUITAR001", "quantity": 1}', 'system'),
('auth.login_failure', 101, 'user@example.com', '{"reason": "invalid_password", "ip": "192.168.1.100"}', 'system')
ON CONFLICT DO NOTHING;

-- SUCCESS MESSAGE
SELECT 'SUCCESS: get_system_logs function created! Your SystemLogTab should now work.' as message;
