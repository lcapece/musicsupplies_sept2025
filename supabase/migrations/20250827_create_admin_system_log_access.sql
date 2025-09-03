-- Migration: Create admin functions for system log access
-- Purpose: Allow admin account 999 to query system logs with filters

BEGIN;

-- Create function to get system logs for admin
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
    ae.event_type::TEXT,
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
    (p_event_types IS NULL OR ae.event_type::TEXT = ANY(p_event_types)) AND
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

-- Grant access to authenticated users (will be restricted by the function's own logic)
GRANT EXECUTE ON FUNCTION public.get_system_logs(TIMESTAMPTZ, TIMESTAMPTZ, TEXT[], TEXT, INTEGER, INTEGER, INTEGER) TO authenticated;

-- Create function to get cart activity for admin
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

-- Grant access to authenticated users (will be restricted by the function's own logic)
GRANT EXECUTE ON FUNCTION public.get_cart_activity_admin(TIMESTAMPTZ, TIMESTAMPTZ, INTEGER, INTEGER, INTEGER) TO authenticated;

-- Create function to get shopping activity for admin
CREATE OR REPLACE FUNCTION public.get_shopping_activity_admin(
  p_start_date TIMESTAMPTZ DEFAULT NULL,
  p_end_date TIMESTAMPTZ DEFAULT NULL,
  p_account_number INTEGER DEFAULT NULL,
  p_limit INTEGER DEFAULT 100,
  p_offset INTEGER DEFAULT 0
) RETURNS TABLE (
  id INTEGER,
  account_number INTEGER,
  product_code VARCHAR(50),
  viewed_at TIMESTAMPTZ,
  page_url TEXT,
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
    pv.id,
    pv.account_number,
    pv.product_code,
    pv.viewed_at,
    pv.page_url,
    pv.session_id
  FROM public.product_views pv
  WHERE 
    (p_start_date IS NULL OR pv.viewed_at >= p_start_date) AND
    (p_end_date IS NULL OR pv.viewed_at <= p_end_date) AND
    (p_account_number IS NULL OR pv.account_number = p_account_number)
  ORDER BY pv.viewed_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$;

-- Grant access to authenticated users (will be restricted by the function's own logic)
GRANT EXECUTE ON FUNCTION public.get_shopping_activity_admin(TIMESTAMPTZ, TIMESTAMPTZ, INTEGER, INTEGER, INTEGER) TO authenticated;

-- Create function to get current cart contents for all users (admin only)
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

-- Grant access to authenticated users (will be restricted by the function's own logic)
GRANT EXECUTE ON FUNCTION public.get_all_cart_contents() TO authenticated;

COMMIT;
