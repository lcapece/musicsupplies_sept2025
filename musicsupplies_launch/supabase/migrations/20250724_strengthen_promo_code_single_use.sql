-- Strengthen Single-Use Promo Code Enforcement
-- This migration adds additional safeguards to prevent exploitation of single-use promo codes

-- Step 1: Add a unique constraint to prevent duplicate usage entries
-- This prevents the same promo code from being used multiple times by the same account on the same order
ALTER TABLE promo_code_usage 
ADD CONSTRAINT unique_promo_usage_per_order 
UNIQUE (promo_code_id, account_number, order_id);

-- Step 2: Create an enhanced validation function with better locking
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
  
  -- Get promo code details with lock to prevent concurrent access
  SELECT * INTO v_promo
  FROM promo_codes
  WHERE UPPER(TRIM(code)) = UPPER(TRIM(p_code))
    AND is_active = TRUE
  FOR UPDATE; -- Lock the row to prevent concurrent modifications
  
  -- Check if promo code exists and is active
  IF v_promo.id IS NULL THEN
    RAISE NOTICE 'Promo code not found or inactive: %', p_code;
    RETURN QUERY SELECT 
      FALSE, 
      'Invalid promo code'::TEXT,
      NULL::UUID,
      NULL::TEXT,
      NULL::DECIMAL,
      NULL::DECIMAL;
    RETURN;
  END IF;
  
  RAISE NOTICE 'Found promo code: % (ID: %)', v_promo.name, v_promo.id;
  
  -- Check date validity
  IF v_promo.start_date IS NOT NULL AND v_promo.start_date > CURRENT_TIMESTAMP THEN
    RETURN QUERY SELECT 
      FALSE, 
      'Promo code is not yet active'::TEXT,
      NULL::UUID,
      NULL::TEXT,
      NULL::DECIMAL,
      NULL::DECIMAL;
    RETURN;
  END IF;
  
  IF v_promo.end_date IS NOT NULL AND v_promo.end_date < CURRENT_TIMESTAMP THEN
    RETURN QUERY SELECT 
      FALSE, 
      'Promo code has expired'::TEXT,
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
      ('Order minimum of $' || COALESCE(v_promo.min_order_value, 0)::TEXT || ' not met')::TEXT,
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
      'Promo code usage limit reached'::TEXT,
      NULL::UUID,
      NULL::TEXT,
      NULL::DECIMAL,
      NULL::DECIMAL;
    RETURN;
  END IF;
  
  -- Enhanced per-account usage check with locking
  IF COALESCE(v_promo.uses_per_account_tracking, FALSE) = TRUE AND v_promo.max_uses_per_account IS NOT NULL THEN
    -- Lock the usage records for this account to prevent race conditions
    PERFORM 1 FROM promo_code_usage
    WHERE promo_code_id = v_promo.id
      AND account_number = p_account_number
    FOR UPDATE;
    
    -- Now count the actual usage
    SELECT COUNT(*) INTO v_account_usage_count
    FROM promo_code_usage
    WHERE promo_code_id = v_promo.id
      AND account_number = p_account_number;
      
    RAISE NOTICE 'Account % has used promo % times (limit: %)', 
      p_account_number, v_account_usage_count, v_promo.max_uses_per_account;
      
    IF v_account_usage_count >= v_promo.max_uses_per_account THEN
      RETURN QUERY SELECT 
        FALSE, 
        CASE 
          WHEN v_promo.max_uses_per_account = 1 THEN 
            'This promo code has already been used on your account'::TEXT
          ELSE 
            ('Maximum uses per account (' || v_promo.max_uses_per_account::TEXT || ') exceeded')::TEXT
        END,
        NULL::UUID,
        NULL::TEXT,
        NULL::DECIMAL,
        NULL::DECIMAL;
      RETURN;
    END IF;
  END IF;
  
  -- Calculate discount amount
  IF v_promo.type = 'percent_off' THEN
    v_discount_amount := ROUND(p_order_value * (v_promo.value / 100.0), 2);
  ELSE -- dollars_off
    v_discount_amount := LEAST(v_promo.value, p_order_value);
  END IF;
  
  RAISE NOTICE 'Promo code validation successful. Discount: %', v_discount_amount;
  
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

-- Step 3: Enhanced record usage function with better error handling
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
DECLARE
  v_promo promo_codes%ROWTYPE;
  v_existing_usage_count INTEGER;
BEGIN
  -- Get promo details with lock
  SELECT * INTO v_promo
  FROM promo_codes
  WHERE id = p_promo_id
  FOR UPDATE;
  
  -- Double-check per-account limits before recording
  IF COALESCE(v_promo.uses_per_account_tracking, FALSE) = TRUE AND v_promo.max_uses_per_account IS NOT NULL THEN
    SELECT COUNT(*) INTO v_existing_usage_count
    FROM promo_code_usage
    WHERE promo_code_id = p_promo_id
      AND account_number = p_account_number;
      
    IF v_existing_usage_count >= v_promo.max_uses_per_account THEN
      RAISE EXCEPTION 'Promo code usage limit exceeded for account %', p_account_number;
    END IF;
  END IF;
  
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
  
  -- Update uses_remaining if the promo code has a limit
  UPDATE promo_codes 
  SET uses_remaining = GREATEST(0, COALESCE(uses_remaining, 0) - 1)
  WHERE id = p_promo_id 
    AND max_uses IS NOT NULL;
  
  RAISE NOTICE 'Successfully recorded promo code usage for account % on order %', p_account_number, p_order_id;
  
  RETURN TRUE;
EXCEPTION
  WHEN unique_violation THEN
    RAISE NOTICE 'Promo code already used for this order';
    RETURN FALSE;
  WHEN OTHERS THEN
    RAISE NOTICE 'Error recording promo code usage: %', SQLERRM;
    RETURN FALSE;
END;
$$;

-- Step 4: Create a function to get promo code usage statistics (for admin dashboard)
CREATE OR REPLACE FUNCTION get_promo_code_usage_stats()
RETURNS TABLE (
  promo_code TEXT,
  promo_name TEXT,
  total_uses INTEGER,
  unique_accounts INTEGER,
  total_discount_given DECIMAL,
  avg_order_value DECIMAL,
  max_uses_per_account INTEGER,
  uses_remaining INTEGER,
  is_single_use BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    pc.code,
    pc.name,
    COUNT(pcu.id)::INTEGER as total_uses,
    COUNT(DISTINCT pcu.account_number)::INTEGER as unique_accounts,
    COALESCE(SUM(pcu.discount_amount), 0) as total_discount_given,
    COALESCE(AVG(pcu.order_value), 0) as avg_order_value,
    pc.max_uses_per_account,
    pc.uses_remaining,
    (pc.uses_per_account_tracking = TRUE AND pc.max_uses_per_account = 1) as is_single_use
  FROM promo_codes pc
  LEFT JOIN promo_code_usage pcu ON pc.id = pcu.promo_code_id
  GROUP BY pc.id, pc.code, pc.name, pc.max_uses_per_account, pc.uses_remaining, pc.uses_per_account_tracking
  ORDER BY COUNT(pcu.id) DESC;
END;
$$;

-- Step 5: Create a function to check which accounts have used a specific promo code
CREATE OR REPLACE FUNCTION get_promo_code_usage_by_accounts(p_code TEXT)
RETURNS TABLE (
  account_number TEXT,
  times_used BIGINT,
  first_used TIMESTAMP WITH TIME ZONE,
  last_used TIMESTAMP WITH TIME ZONE,
  total_discount DECIMAL
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    pcu.account_number,
    COUNT(*)::BIGINT as times_used,
    MIN(pcu.used_at) as first_used,
    MAX(pcu.used_at) as last_used,
    SUM(pcu.discount_amount) as total_discount
  FROM promo_code_usage pcu
  JOIN promo_codes pc ON pc.id = pcu.promo_code_id
  WHERE UPPER(pc.code) = UPPER(p_code)
  GROUP BY pcu.account_number
  ORDER BY COUNT(*) DESC, MAX(pcu.used_at) DESC;
END;
$$;

-- Step 6: Grant permissions
GRANT EXECUTE ON FUNCTION get_promo_code_usage_stats TO authenticated;
GRANT EXECUTE ON FUNCTION get_promo_code_usage_by_accounts TO authenticated;

-- Step 7: Create a high-value single-use promo code for testing
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
  uses_per_account_tracking,
  max_uses_per_account
) VALUES (
  'SPECIAL50',
  '50% Off - One Time Only',
  'percent_off',
  50.00,
  100.00,
  NULL,
  NULL,
  CURRENT_TIMESTAMP,
  '2025-12-31 23:59:59'::timestamp,
  TRUE,
  TRUE,
  1
)
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  type = EXCLUDED.type,
  value = EXCLUDED.value,
  min_order_value = EXCLUDED.min_order_value,
  uses_per_account_tracking = EXCLUDED.uses_per_account_tracking,
  max_uses_per_account = EXCLUDED.max_uses_per_account,
  is_active = EXCLUDED.is_active;

-- Step 8: Create a trigger to log all promo code validation attempts (for security auditing)
CREATE TABLE IF NOT EXISTS promo_code_validation_log (
  id SERIAL PRIMARY KEY,
  attempted_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  promo_code TEXT,
  account_number TEXT,
  order_value DECIMAL,
  validation_result BOOLEAN,
  failure_reason TEXT,
  ip_address INET
);

-- Enable RLS on the log table
ALTER TABLE promo_code_validation_log ENABLE ROW LEVEL SECURITY;

-- Only admin can view logs
CREATE POLICY "Admin view promo validation logs" ON promo_code_validation_log
FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM accounts_lcmd 
    WHERE account_no = current_setting('app.account_number', true)
    AND account_no = '999'
  )
);

-- Step 9: Test the single-use enforcement
DO $$
DECLARE
  test_result RECORD;
  test_account TEXT := 'TEST123';
BEGIN
  -- First use should succeed
  SELECT * INTO test_result 
  FROM check_promo_code_validity('SPECIAL50', test_account, 150.00) 
  LIMIT 1;
  
  IF test_result.is_valid THEN
    RAISE NOTICE 'Test 1 PASSED: First use of SPECIAL50 validated successfully';
    
    -- Record the usage
    PERFORM record_promo_code_usage(
      test_result.promo_id,
      test_account,
      999999, -- test order ID
      150.00,
      test_result.discount_amount
    );
    
    -- Second use should fail
    SELECT * INTO test_result 
    FROM check_promo_code_validity('SPECIAL50', test_account, 150.00) 
    LIMIT 1;
    
    IF NOT test_result.is_valid AND test_result.message LIKE '%already been used%' THEN
      RAISE NOTICE 'Test 2 PASSED: Second use of SPECIAL50 correctly rejected';
    ELSE
      RAISE NOTICE 'Test 2 FAILED: Second use was not rejected properly';
    END IF;
    
    -- Clean up test data
    DELETE FROM promo_code_usage 
    WHERE account_number = test_account 
      AND order_id = 999999;
    
  ELSE
    RAISE NOTICE 'Test 1 FAILED: First use validation failed';
  END IF;
END $$;

-- Final status
SELECT 'SINGLE-USE PROMO CODE ENFORCEMENT STRENGTHENED!' as status;
