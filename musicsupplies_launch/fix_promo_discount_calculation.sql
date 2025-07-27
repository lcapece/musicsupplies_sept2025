-- Fix promo code discount calculation issue
-- The SAVE10 code should give 10% off $3.08 = $0.31, not $0.01

-- First, let's check the current promo code data
SELECT code, name, type, value, min_order_value, is_active 
FROM promo_codes 
WHERE code = 'SAVE10';

-- Update the check_promo_code_validity function to ensure proper decimal handling
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
  v_account_usage_count INTEGER := 0;
  v_discount_amount DECIMAL := 0;
BEGIN
  -- Log the validation attempt for debugging
  RAISE NOTICE 'Validating promo code: % for account: % with order value: %', p_code, p_account_number, p_order_value;
  
  -- Get promo code details (case insensitive search)
  SELECT * INTO v_promo
  FROM promo_codes
  WHERE UPPER(TRIM(code)) = UPPER(TRIM(p_code))
    AND is_active = TRUE;
  
  -- Check if promo code exists and is active
  IF v_promo.id IS NULL THEN
    RAISE NOTICE 'Promo code not found or inactive: %', p_code;
    RETURN QUERY SELECT 
      FALSE, 
      'Invalid promo code'::TEXT,
      NULL::UUID,
      NULL::TEXT,
      NULL::DECIMAL,
      0.00::DECIMAL;
    RETURN;
  END IF;
  
  RAISE NOTICE 'Found promo code: % (ID: %, Type: %, Value: %)', v_promo.name, v_promo.id, v_promo.type, v_promo.value;
  
  -- Check date validity
  IF v_promo.start_date IS NOT NULL AND v_promo.start_date > CURRENT_TIMESTAMP THEN
    RETURN QUERY SELECT 
      FALSE, 
      'Promo code is not yet active'::TEXT,
      NULL::UUID,
      NULL::TEXT,
      NULL::DECIMAL,
      0.00::DECIMAL;
    RETURN;
  END IF;
  
  IF v_promo.end_date IS NOT NULL AND v_promo.end_date < CURRENT_TIMESTAMP THEN
    RETURN QUERY SELECT 
      FALSE, 
      'Promo code has expired'::TEXT,
      NULL::UUID,
      NULL::TEXT,
      NULL::DECIMAL,
      0.00::DECIMAL;
    RETURN;
  END IF;
  
  -- Check if minimum order value is met
  IF p_order_value < COALESCE(v_promo.min_order_value, 0) THEN
    RETURN QUERY SELECT 
      FALSE, 
      ('Order minimum of $' || COALESCE(v_promo.min_order_value, 0)::TEXT || ' not met')::TEXT,
      NULL::UUID,
      NULL::TEXT,
      NULL::DECIMAL,
      0.00::DECIMAL;
    RETURN;
  END IF;
  
  -- Check if there are uses remaining (if limited)
  IF v_promo.max_uses IS NOT NULL AND COALESCE(v_promo.uses_remaining, 0) <= 0 THEN
    RETURN QUERY SELECT 
      FALSE, 
      'Promo code usage limit reached'::TEXT,
      NULL::UUID,
      NULL::TEXT,
      NULL::DECIMAL,
      0.00::DECIMAL;
    RETURN;
  END IF;
  
  -- Check per-account usage limit if enabled
  IF COALESCE(v_promo.uses_per_account_tracking, FALSE) = TRUE AND v_promo.max_uses_per_account IS NOT NULL THEN
    SELECT COUNT(*) INTO v_account_usage_count
    FROM promo_code_usage
    WHERE promo_code_id = v_promo.id
      AND account_number = p_account_number;
      
    IF v_account_usage_count >= v_promo.max_uses_per_account THEN
      RETURN QUERY SELECT 
        FALSE, 
        'Maximum uses per account exceeded'::TEXT,
        NULL::UUID,
        NULL::TEXT,
        NULL::DECIMAL,
        0.00::DECIMAL;
      RETURN;
    END IF;
  END IF;
  
  -- Calculate discount amount with proper decimal precision
  IF v_promo.type = 'percent_off' THEN
    -- Ensure we're doing decimal math, not integer math
    v_discount_amount := ROUND((p_order_value * v_promo.value / 100.0)::DECIMAL, 2);
    RAISE NOTICE 'Percent calculation: % * % / 100 = %', p_order_value, v_promo.value, v_discount_amount;
  ELSE -- dollars_off
    v_discount_amount := LEAST(v_promo.value, p_order_value);
    RAISE NOTICE 'Dollar amount calculation: LEAST(%, %) = %', v_promo.value, p_order_value, v_discount_amount;
  END IF;
  
  RAISE NOTICE 'Final discount amount: %', v_discount_amount;
  
  -- Return success with promo details
  RETURN QUERY SELECT 
    TRUE, 
    ('Promo code applied: ' || v_promo.name)::TEXT,
    v_promo.id,
    v_promo.type::TEXT,
    v_promo.value,
    v_discount_amount;
END;
$$;

-- Test the function with the exact values from the user's issue
SELECT 
  is_valid,
  message,
  promo_type,
  promo_value,
  discount_amount,
  'Expected: $0.31' as expected_discount
FROM check_promo_code_validity('SAVE10', '101', 3.08);

-- Also test with a round number to verify percentage calculation
SELECT 
  is_valid,
  message,
  promo_type,
  promo_value,
  discount_amount,
  'Expected: $10.00' as expected_discount
FROM check_promo_code_validity('SAVE10', '101', 100.00);
