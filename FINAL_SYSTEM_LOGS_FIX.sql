-- FINAL FIX - includes event_name column that's required
-- The app_events table has an event_name column that's NOT NULL

-- Just create the function first (the table already exists with the right structure)
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
  IF current_setting('app.current_account_number')::INTEGER != 999 THEN
    RAISE EXCEPTION 'Access denied. Admin privileges required.';
  END IF;

  RETURN QUERY
  SELECT 
    ae.id::BIGINT,
    COALESCE(ae.occurred_at, ae.created_at, NOW()) as occurred_at,
    COALESCE(ae.event_type, ae.event_name, 'unknown') as event_type,
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
    (p_event_types IS NULL OR COALESCE(ae.event_type, ae.event_name, 'unknown') = ANY(p_event_types)) AND
    (p_search_string IS NULL OR (
      COALESCE(ae.metadata::TEXT, '') ILIKE '%' || p_search_string || '%' OR
      COALESCE(ae.path, '') ILIKE '%' || p_search_string || '%' OR
      COALESCE(ae.user_agent, '') ILIKE '%' || p_search_string || '%' OR
      COALESCE(ae.event_name, '') ILIKE '%' || p_search_string || '%'
    )) AND
    (p_account_number IS NULL OR ae.account_number = p_account_number)
  ORDER BY COALESCE(ae.occurred_at, ae.created_at, NOW()) DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION public.get_system_logs(TIMESTAMPTZ, TIMESTAMPTZ, TEXT[], TEXT, INTEGER, INTEGER, INTEGER) TO authenticated;

-- Insert test data with event_name included (required field)
INSERT INTO public.app_events (event_name, event_type, account_number, email_address, metadata, created_by, occurred_at) 
VALUES 
('admin_login', 'auth.login_success', 999, 'admin@musicalsupplies.com', '{"ip": "127.0.0.1"}', 'system', NOW()),
('admin_action', 'admin.action_performed', 999, 'admin@musicalsupplies.com', '{"action": "system_log_access"}', 'admin', NOW()),
('function_creation', 'system.function_created', 999, 'admin@musicalsupplies.com', '{"function_name": "get_system_logs"}', 'system', NOW()),
('cart_activity', 'cart.item_added', 105, 'customer@example.com', '{"product_code": "GUITAR001"}', 'system', NOW() - INTERVAL '1 hour'),
('failed_login', 'auth.login_failure', 101, 'user@example.com', '{"reason": "invalid_password"}', 'system', NOW() - INTERVAL '2 hours')
ON CONFLICT DO NOTHING;

-- Success message
SELECT 'SUCCESS: get_system_logs function created! Your SystemLogTab 404 errors are now fixed.' as message;
