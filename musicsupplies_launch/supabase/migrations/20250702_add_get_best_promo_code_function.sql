-- Function to get only the best promo code for a user
CREATE OR REPLACE FUNCTION get_best_promo_code(
  p_account_number TEXT
)
RETURNS TABLE (
  code TEXT,
  name TEXT,
  description TEXT,
  type TEXT,
  value DECIMAL,
  min_order_value DECIMAL
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Return only the best promo code (assuming a minimal order value for calculation)
  -- This is a simplified version that always returns the first available promo code
  -- sorted by potential value
  RETURN QUERY
  SELECT 
    pc.code,
    pc.name,
    'Save ' || 
      CASE 
        WHEN pc.type = 'percent_off' THEN pc.value::TEXT || '%'
        ELSE '$' || pc.value::TEXT
      END ||
      CASE
        WHEN pc.min_order_value > 0 THEN ' on orders over $' || pc.min_order_value::TEXT
        ELSE ''
      END ||
      CASE
        WHEN pc.max_uses IS NOT NULL THEN ' (Limited time offer)'
        ELSE ''
      END as description,
    pc.type,
    pc.value,
    pc.min_order_value
  FROM promo_codes pc
  WHERE pc.is_active = TRUE
    AND pc.start_date <= CURRENT_TIMESTAMP
    AND pc.end_date >= CURRENT_TIMESTAMP
    AND (pc.max_uses IS NULL OR pc.uses_remaining > 0)
  ORDER BY
    -- Sort by percentage off first (higher percentages first)
    CASE WHEN pc.type = 'percent_off' THEN pc.value ELSE 0 END DESC,
    -- Then by fixed amount off (higher amounts first)
    CASE WHEN pc.type = 'dollars_off' THEN pc.value ELSE 0 END DESC,
    -- Then by minimum order value (lower minimums first)
    pc.min_order_value ASC
  LIMIT 1;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION get_best_promo_code TO anon, authenticated;
