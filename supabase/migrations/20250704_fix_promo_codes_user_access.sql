-- Fix promo codes RLS policies to ensure regular users can access active promo codes

-- Ensure the user policy for viewing active promo codes exists and is correct
DROP POLICY IF EXISTS "Users can view active promo codes" ON promo_codes;

-- Recreate the policy for regular users to view active promo codes
CREATE POLICY "Users can view active promo codes" ON promo_codes
  FOR SELECT TO authenticated
  USING (
    is_active = TRUE 
    AND start_date <= CURRENT_TIMESTAMP 
    AND end_date >= CURRENT_TIMESTAMP
  );

-- Ensure the existing functions have proper permissions and work with RLS
-- Recreate get_best_promo_code function to ensure it works properly
CREATE OR REPLACE FUNCTION get_best_promo_code(p_account_number TEXT)
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
    -- Prioritize percent_off over dollars_off for simplicity
    CASE WHEN pc.type = 'percent_off' THEN 1 ELSE 0 END DESC,
    -- Higher value is better
    pc.value DESC,
    -- Lower minimum order value is better
    pc.min_order_value ASC
  LIMIT 1;
END;
$$;

-- Ensure functions have proper permissions
GRANT EXECUTE ON FUNCTION get_best_promo_code TO anon, authenticated;
GRANT EXECUTE ON FUNCTION get_available_promo_codes TO anon, authenticated;
GRANT EXECUTE ON FUNCTION check_promo_code_validity TO anon, authenticated;
GRANT EXECUTE ON FUNCTION record_promo_code_usage TO anon, authenticated;
