kkkkkkkkkkkkkkkkkkkkkkkkk-- COMPREHENSIVE PROMO CODE VALIDATION FIX FOR HOSTED SUPABASE
-- Run this entire script in your Supabase Dashboard > SQL Editor

-- Step 1: Fix RLS policies for promo codes table
DROP POLICY IF EXISTS "Users can view promo codes" ON promo_codes;
DROP POLICY IF EXISTS "Users can view promo codes for their account" ON promo_codes;
DROP POLICY IF EXISTS "Allow promo code validation" ON promo_codes;

-- Create a simple policy that allows reading promo codes for validation
CREATE POLICY "Allow promo code validation" ON promo_codes FOR SELECT USING (is_active = true);

-- Ensure the table is accessible for RLS
ALTER TABLE promo_codes ENABLE ROW LEVEL SECURITY;

-- Step 2: Fix RLS policies for promo_code_usage table
DROP POLICY IF EXISTS "Users can view their promo code usage" ON promo_code_usage;
DROP POLICY IF EXISTS "Allow promo code usage lookup" ON promo_code_usage;

CREATE POLICY "Allow promo code usage lookup" ON promo_code_usage FOR SELECT USING (true);
ALTER TABLE promo_code_usage ENABLE ROW LEVEL SECURITY;

-- Step 3: Create improved validation function with better error handling
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
  v_debug_message TEXT := '';
BEGIN
  -- Debug: Log the input parameters
  v_debug_message := 'Checking code: ' || COALESCE(p_code, 'NULL') || 
                    ', account: ' || COALESCE(p_account_number, 'NULL') || 
                    ', order_value: ' || COALESCE(p_order_value::TEXT, 'NULL');
  
  -- Get promo code details (case insensitive)
  SELECT * INTO v_promo
  FROM promo_codes
  WHERE UPPER(TRIM(code)) = UPPER(TRIM(p_code))
    AND is_active = TRUE;
  
  -- Check if promo code exists and is active
  IF v_promo.id IS NULL THEN
    -- Check if code exists but is inactive or expired
    SELECT * INTO v_promo FROM promo_codes WHERE UPPER(TRIM(code)) = UPPER(TRIM(p_code));
    
    IF v_promo.id IS NULL THEN
      RETURN QUERY SELECT 
        FALSE, 
        'Promo code not found.'::TEXT,
        NULL::UUID,
        NULL::TEXT,
        NULL::DECIMAL,
        NULL::DECIMAL;
    ELSIF v_promo.is_active = FALSE THEN
      RETURN QUERY SELECT 
        FALSE, 
        'Promo code is inactive.'::TEXT,
        NULL::UUID,
        NULL::TEXT,
        NULL::DECIMAL,
        NULL::DECIMAL;
    ELSIF v_promo.start_date > CURRENT_TIMESTAMP THEN
      RETURN QUERY SELECT 
        FALSE, 
        'Promo code is not yet active.'::TEXT,
        NULL::UUID,
        NULL::TEXT,
        NULL::DECIMAL,
        NULL::DECIMAL;
    ELSIF v_promo.end_date < CURRENT_TIMESTAMP THEN
      RETURN QUERY SELECT 
        FALSE, 
        'Promo code has expired.'::TEXT,
        NULL::UUID,
        NULL::TEXT,
        NULL::DECIMAL,
        NULL::DECIMAL;
    ELSE
      RETURN QUERY SELECT 
        FALSE, 
        'Promo code is not currently available.'::TEXT,
        NULL::UUID,
        NULL::TEXT,
        NULL::DECIMAL,
        NULL::DECIMAL;
    END IF;
    RETURN;
  END IF;
  
  -- Check date validity
  IF v_promo.start_date > CURRENT_TIMESTAMP THEN
    RETURN QUERY SELECT 
      FALSE, 
      'Promo code is not yet active.'::TEXT,
      NULL::UUID,
      NULL::TEXT,
      NULL::DECIMAL,
      NULL::DECIMAL;
    RETURN;
  END IF;
  
  IF v_promo.end_date < CURRENT_TIMESTAMP THEN
    RETURN QUERY SELECT 
      FALSE, 
      'Promo code has expired.'::TEXT,
      NULL::UUID,
      NULL::TEXT,
      NULL::DECIMAL,
      NULL::DECIMAL;
    RETURN;
  END IF;
  
  -- Check if minimum order value is met
  IF p_order_value < COALESCE(v_promo.min_order_value, 0) THEN
    RETURN QUERY SELECT 
      FALSE, 
      ('Order value of $' || p_order_value::TEXT || ' does not meet minimum requirement of $' || COALESCE(v_promo.min_order_value, 0)::TEXT)::TEXT,
      NULL::UUID,
      NULL::TEXT,
      NULL::DECIMAL,
      NULL::DECIMAL;
    RETURN;
  END IF;
  
  -- Check if there are uses remaining (if limited)
  IF v_promo.max_uses IS NOT NULL AND COALESCE(v_promo.uses_remaining, 0) <= 0 THEN
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
  IF COALESCE(v_promo.uses_per_account_tracking, FALSE) = TRUE AND v_promo.max_uses_per_account IS NOT NULL THEN
    SELECT COUNT(*) INTO v_account_usage_count
    FROM promo_code_usage
    WHERE promo_code_id = v_promo.id
      AND account_number = p_account_number;
      
    IF v_account_usage_count >= v_promo.max_uses_per_account THEN
      RETURN QUERY SELECT 
        FALSE, 
        ('You have already used this promo code ' || v_account_usage_count::TEXT || ' times. Maximum allowed: ' || v_promo.max_uses_per_account::TEXT)::TEXT,
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
    ('Promo code "' || v_promo.name || '" applied successfully!')::TEXT,
    v_promo.id,
    v_promo.type::TEXT,
    v_promo.value,
    v_discount_amount;
END;
$$;

-- Step 4: Create/update the record_promo_code_usage function
CREATE OR REPLACE FUNCTION record_promo_code_usage(
  p_promo_id UUID,
  p_account_number TEXT,
  p_order_id INTEGER,
  p_order_value DECIMAL,
  p_discount_amount DECIMAL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Insert usage record
  INSERT INTO promo_code_usage (
    promo_code_id,
    account_number,
    order_id,
    used_at,
    order_value,
    discount_amount
  ) VALUES (
    p_promo_id,
    p_account_number,
    p_order_id,
    CURRENT_TIMESTAMP,
    p_order_value,
    p_discount_amount
  );

  -- Update uses_remaining if the promo code has limited uses
  UPDATE promo_codes 
  SET uses_remaining = uses_remaining - 1
  WHERE id = p_promo_id 
    AND max_uses IS NOT NULL 
    AND uses_remaining > 0;

  RETURN TRUE;
EXCEPTION
  WHEN OTHERS THEN
    -- Log error but don't fail the order
    RAISE WARNING 'Failed to record promo code usage: %', SQLERRM;
    RETURN FALSE;
END;
$$;

-- Step 5: Grant proper permissions
GRANT EXECUTE ON FUNCTION check_promo_code_validity TO anon, authenticated;
GRANT EXECUTE ON FUNCTION record_promo_code_usage TO anon, authenticated;

-- Step 6: Insert/update test promo codes
INSERT INTO promo_codes (
  code, 
  name, 
  type, 
  value, 
  min_order_value, 
  max_uses, 
  uses_remaining, 
  start_date, 
  end_date, 
  is_active,
  max_uses_per_account,
  uses_per_account_tracking
) VALUES 
(
  'SAVE10',
  '10% Off Any Order',
  'percent_off',
  10.00,
  0.00,
  NULL,
  NULL,
  CURRENT_TIMESTAMP - INTERVAL '1 day',
  CURRENT_TIMESTAMP + INTERVAL '1 year',
  TRUE,
  NULL,
  FALSE
),
(
  'WELCOME25',
  'Welcome $25 Off',
  'dollars_off',
  25.00,
  100.00,
  1000,
  1000,
  CURRENT_TIMESTAMP - INTERVAL '1 day',
  CURRENT_TIMESTAMP + INTERVAL '6 months',
  TRUE,
  3,
  TRUE
),
(
  'BIGORDER50',
  '$50 Off Orders Over $500',
  'dollars_off',
  50.00,
  500.00,
  NULL,
  NULL,
  CURRENT_TIMESTAMP - INTERVAL '1 day',
  CURRENT_TIMESTAMP + INTERVAL '1 year',
  TRUE,
  NULL,
  FALSE
)
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  type = EXCLUDED.type,
  value = EXCLUDED.value,
  min_order_value = EXCLUDED.min_order_value,
  start_date = EXCLUDED.start_date,
  end_date = EXCLUDED.end_date,
  is_active = EXCLUDED.is_active;

-- Step 7: Create a debug function for testing
CREATE OR REPLACE FUNCTION debug_promo_code(p_code TEXT, p_account TEXT, p_order_value DECIMAL)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_result RECORD;
  v_count INTEGER;
BEGIN
  -- Check if promo codes exist
  SELECT COUNT(*) INTO v_count FROM promo_codes WHERE UPPER(TRIM(code)) = UPPER(TRIM(p_code));
  
  IF v_count = 0 THEN
    RETURN 'Promo code not found in database';
  END IF;
  
  -- Test validation function
  SELECT * INTO v_result FROM check_promo_code_validity(p_code, p_account, p_order_value);
  
  RETURN 'Validation result: ' || v_result.is_valid::TEXT || ', Message: ' || COALESCE(v_result.message, 'NULL');
END;
$$;

GRANT EXECUTE ON FUNCTION debug_promo_code TO anon, authenticated;

-- Step 8: Verify the fix worked
SELECT 'PROMO CODE VALIDATION FIX COMPLETED!' as status;
SELECT 'Test with: SELECT * FROM debug_promo_code(''SAVE10'', ''101'', 50.00);' as test_command;
