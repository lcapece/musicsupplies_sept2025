-- Fix promo code functions to handle data type mismatches and improve functionality

-- First, fix the get_best_promo_code function
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
    pc.code::TEXT,
    pc.name::TEXT,
    ('Save ' || 
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
      END)::TEXT as description,
    pc.type::TEXT,
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

-- Create a new function that the frontend can use to get all available promo codes
CREATE OR REPLACE FUNCTION get_all_promo_codes(p_account_number TEXT)
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
  v_best_code TEXT := '';
  v_sample_order_value DECIMAL := 100.00; -- Use $100 as sample order for comparison
BEGIN
  -- First, find the best promo code
  SELECT pc.code::TEXT INTO v_best_code
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

  -- Return all available promo codes with best flag
  RETURN QUERY
  SELECT
    pc.code::TEXT,
    pc.name::TEXT,
    ('Save ' || 
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
      END)::TEXT as description,
    pc.type::TEXT,
    pc.value,
    pc.min_order_value,
    -- Calculate discount amount based on sample order
    CASE 
      WHEN pc.type = 'percent_off' THEN v_sample_order_value * (pc.value / 100.0)
      ELSE LEAST(pc.value, v_sample_order_value)
    END as discount_amount,
    (pc.code::TEXT = v_best_code) as is_best
  FROM promo_codes pc
  WHERE pc.is_active = TRUE
    AND pc.start_date <= CURRENT_TIMESTAMP
    AND pc.end_date >= CURRENT_TIMESTAMP
    AND (pc.max_uses IS NULL OR pc.uses_remaining > 0)
  ORDER BY
    is_best DESC,
    -- Prioritize higher percentage discounts
    CASE WHEN pc.type = 'percent_off' THEN pc.value ELSE 0 END DESC,
    -- Then higher dollar amounts
    CASE WHEN pc.type = 'dollars_off' THEN pc.value ELSE 0 END DESC,
    -- Lower minimum order value is better
    pc.min_order_value ASC;
END;
$$;

-- Fix the check_promo_code_validity function to handle per-account limits
CREATE OR REPLACE FUNCTION check_promo_code_validity(
  p_code TEXT,
  p_account_number TEXT,
  p_order_value DECIMAL
)
RETURNS TABLE (
  is_valid BOOLEAN,
  message TEXT,
  promo_id UUID,
  promo_type TEXT,
  promo_value DECIMAL,
  discount_amount DECIMAL
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_promo promo_codes%ROWTYPE;
  v_account_usage_count INTEGER;
  v_discount_amount DECIMAL;
BEGIN
  -- Get promo code details (convert to uppercase for case insensitivity)
  SELECT * INTO v_promo
  FROM promo_codes
  WHERE UPPER(code) = UPPER(p_code)
    AND is_active = TRUE
    AND start_date <= CURRENT_TIMESTAMP
    AND end_date >= CURRENT_TIMESTAMP;
  
  -- Check if promo code exists and is active
  IF v_promo.id IS NULL THEN
    RETURN QUERY SELECT 
      FALSE, 
      'Invalid or expired promo code.'::TEXT,
      NULL::UUID,
      NULL::TEXT,
      NULL::DECIMAL,
      NULL::DECIMAL;
    RETURN;
  END IF;
  
  -- Check if minimum order value is met
  IF p_order_value < v_promo.min_order_value THEN
    RETURN QUERY SELECT 
      FALSE, 
      ('Order value does not meet minimum requirement of $' || v_promo.min_order_value::TEXT)::TEXT,
      NULL::UUID,
      NULL::TEXT,
      NULL::DECIMAL,
      NULL::DECIMAL;
    RETURN;
  END IF;
  
  -- Check if there are uses remaining (if limited)
  IF v_promo.max_uses IS NOT NULL AND v_promo.uses_remaining <= 0 THEN
    RETURN QUERY SELECT 
      FALSE, 
      'This promo code has reached its usage limit.'::TEXT,
      NULL::UUID,
      NULL::TEXT,
      NULL::DECIMAL,
      NULL::DECIMAL;
    RETURN;
  END IF;
  
  -- Check per-account usage limit if enabled
  IF v_promo.uses_per_account_tracking = TRUE AND v_promo.max_uses_per_account IS NOT NULL THEN
    SELECT COUNT(*) INTO v_account_usage_count
    FROM promo_code_usage
    WHERE promo_code_id = v_promo.id
      AND account_number = p_account_number;
      
    IF v_account_usage_count >= v_promo.max_uses_per_account THEN
      RETURN QUERY SELECT 
        FALSE, 
        'You have already used this promo code the maximum number of times allowed.'::TEXT,
        NULL::UUID,
        NULL::TEXT,
        NULL::DECIMAL,
        NULL::DECIMAL;
      RETURN;
    END IF;
  END IF;
  
  -- Calculate discount amount
  IF v_promo.type = 'percent_off' THEN
    v_discount_amount := p_order_value * (v_promo.value / 100.0);
  ELSE -- dollars_off
    v_discount_amount := v_promo.value;
    -- Ensure discount doesn't exceed order value
    IF v_discount_amount > p_order_value THEN
      v_discount_amount := p_order_value;
    END IF;
  END IF;
  
  -- Return success with promo details
  RETURN QUERY SELECT 
    TRUE, 
    ('Promo code applied successfully: ' || v_promo.name)::TEXT,
    v_promo.id,
    v_promo.type::TEXT,
    v_promo.value,
    v_discount_amount;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION get_best_promo_code TO anon, authenticated;
GRANT EXECUTE ON FUNCTION get_all_promo_codes TO anon, authenticated;
GRANT EXECUTE ON FUNCTION check_promo_code_validity TO anon, authenticated;
