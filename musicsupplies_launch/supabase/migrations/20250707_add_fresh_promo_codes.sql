-- Add fresh promo codes to ensure dropdown is always populated
-- First, let's update any expired codes and add new ones

-- Update existing codes to extend their validity if they exist
UPDATE promo_codes 
SET 
  end_date = CURRENT_TIMESTAMP + INTERVAL '365 days',
  uses_remaining = CASE 
    WHEN max_uses IS NOT NULL THEN max_uses 
    ELSE NULL 
  END,
  is_active = TRUE
WHERE code IN ('SAVE5', '1PCT', 'SUMMER25');

-- Insert additional promo codes to ensure we always have options
INSERT INTO promo_codes (code, name, type, value, min_order_value, max_uses, uses_remaining, start_date, end_date, is_active)
VALUES
  ('WELCOME10', 'Welcome 10% Off', 'percent_off', 10, 0, NULL, NULL, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP + INTERVAL '365 days', TRUE),
  ('SAVE15', 'Save 15% Today', 'percent_off', 15, 50, NULL, NULL, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP + INTERVAL '365 days', TRUE),
  ('FIRSTORDER', 'First Order Special', 'percent_off', 20, 100, NULL, NULL, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP + INTERVAL '365 days', TRUE),
  ('DISCOUNT5', '$5 Off Your Order', 'dollars_off', 5, 25, NULL, NULL, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP + INTERVAL '365 days', TRUE),
  ('BIGDEAL50', 'Big Deal $50 Off', 'dollars_off', 50, 200, NULL, NULL, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP + INTERVAL '365 days', TRUE)
ON CONFLICT (code) DO UPDATE SET
  end_date = EXCLUDED.end_date,
  uses_remaining = EXCLUDED.uses_remaining,
  is_active = EXCLUDED.is_active;

-- Update the get_best_promo_code function to ensure it returns all available codes
CREATE OR REPLACE FUNCTION get_available_promo_codes(p_account_number TEXT)
RETURNS TABLE (
  code TEXT,
  name TEXT,
  description TEXT,
  type TEXT,
  value DECIMAL,
  min_order_value DECIMAL,
  discount_amount DECIMAL,
  is_best BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_best_value DECIMAL := 0;
  v_best_code TEXT := '';
BEGIN
  -- First, find the best promo code value for comparison
  SELECT 
    CASE 
      WHEN pc.type = 'percent_off' THEN 20 -- Assume $100 order for comparison
      ELSE pc.value
    END INTO v_best_value
  FROM promo_codes pc
  WHERE pc.is_active = TRUE
    AND pc.start_date <= CURRENT_TIMESTAMP
    AND pc.end_date >= CURRENT_TIMESTAMP
    AND (pc.max_uses IS NULL OR pc.uses_remaining > 0)
  ORDER BY
    CASE WHEN pc.type = 'percent_off' THEN pc.value * 0.2 ELSE pc.value END DESC,
    pc.min_order_value ASC
  LIMIT 1;

  -- Get the code of the best promo
  SELECT pc.code INTO v_best_code
  FROM promo_codes pc
  WHERE pc.is_active = TRUE
    AND pc.start_date <= CURRENT_TIMESTAMP
    AND pc.end_date >= CURRENT_TIMESTAMP
    AND (pc.max_uses IS NULL OR pc.uses_remaining > 0)
  ORDER BY
    CASE WHEN pc.type = 'percent_off' THEN pc.value * 0.2 ELSE pc.value END DESC,
    pc.min_order_value ASC
  LIMIT 1;

  -- Return all available promo codes with best flag
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
    pc.min_order_value,
    CASE 
      WHEN pc.type = 'percent_off' THEN 20.0 * (pc.value / 100.0) -- Assume $100 order for calculation
      ELSE pc.value
    END as discount_amount,
    (pc.code = v_best_code) as is_best
  FROM promo_codes pc
  WHERE pc.is_active = TRUE
    AND pc.start_date <= CURRENT_TIMESTAMP
    AND pc.end_date >= CURRENT_TIMESTAMP
    AND (pc.max_uses IS NULL OR pc.uses_remaining > 0)
  ORDER BY
    is_best DESC,
    CASE WHEN pc.type = 'percent_off' THEN pc.value * 0.2 ELSE pc.value END DESC,
    pc.min_order_value ASC;
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION get_available_promo_codes TO anon, authenticated;

-- Make sure the get_best_promo_code function works correctly
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
    -- Prioritize higher percentage discounts
    CASE WHEN pc.type = 'percent_off' THEN pc.value ELSE 0 END DESC,
    -- Then higher dollar amounts
    CASE WHEN pc.type = 'dollars_off' THEN pc.value ELSE 0 END DESC,
    -- Lower minimum order value is better
    pc.min_order_value ASC
  LIMIT 1;
END;
$$;
