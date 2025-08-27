-- Create the reserve_order_number function that the application expects
CREATE OR REPLACE FUNCTION reserve_order_number(p_session_id TEXT, p_account_number TEXT)
RETURNS TABLE(order_number INTEGER, order_id UUID) AS $$
BEGIN
  -- For now, generate a simple incremental order number
  -- This should be replaced with proper session-based reservation logic
  RETURN QUERY
  SELECT 
    COALESCE(MAX(CAST(SUBSTRING(order_number FROM 3) AS INTEGER)), 0) + 1 AS order_number,
    gen_random_uuid() AS order_id
  FROM web_orders
  WHERE order_number ~ '^WB[0-9]+$';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION reserve_order_number(TEXT, TEXT) TO authenticated;