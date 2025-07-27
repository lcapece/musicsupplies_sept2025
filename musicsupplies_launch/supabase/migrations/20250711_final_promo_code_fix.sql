-- FINAL PROMO CODE FIX - Comprehensive solution for SAVE10 and other promo codes
-- This migration will ensure promo codes work correctly in the hosted environment

-- Step 1: Ensure RLS policies are correct for promo codes
DROP POLICY IF EXISTS "Allow promo code validation" ON promo_codes;
DROP POLICY IF EXISTS "Allow promo code usage lookup" ON promo_code_usage;

-- Create permissive policies for promo code validation
CREATE POLICY "Enable read access for active promo codes" ON promo_codes 
FOR SELECT USING (is_active = true);

CREATE POLICY "Enable read access for promo code usage" ON promo_code_usage 
FOR SELECT USING (true);

CREATE POLICY "Enable insert for promo code usage" ON promo_code_usage 
FOR INSERT WITH CHECK (true);

-- Ensure RLS is enabled
ALTER TABLE promo_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE promo_code_usage ENABLE ROW LEVEL SECURITY;

-- Step 2: Create a robust promo code validation function
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
        NULL::DECIMAL;
      RETURN;
    END IF;
  END IF;
  
  -- Calculate discount amount
  IF v_promo.type = 'percent_off' THEN
    v_discount_amount := p_order_value * (v_promo.value / 100.0);
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

-- Step 3: Ensure the get_all_promo_codes function works correctly
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
  v_sample_order_value DECIMAL := 100.00;
BEGIN
  -- Find the best promo code
  SELECT pc.code INTO v_best_code
  FROM promo_codes pc
  WHERE pc.is_active = TRUE
    AND (pc.start_date IS NULL OR pc.start_date <= CURRENT_TIMESTAMP)
    AND (pc.end_date IS NULL OR pc.end_date >= CURRENT_TIMESTAMP)
    AND (pc.max_uses IS NULL OR COALESCE(pc.uses_remaining, 0) > 0)
  ORDER BY
    CASE WHEN pc.type = 'percent_off' THEN pc.value ELSE 0 END DESC,
    CASE WHEN pc.type = 'dollars_off' THEN pc.value ELSE 0 END DESC,
    COALESCE(pc.min_order_value, 0) ASC
  LIMIT 1;

  -- Return all available promo codes
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
        WHEN COALESCE(pc.min_order_value, 0) > 0 THEN ' (Min order: $' || pc.min_order_value::TEXT || ')'
        ELSE ''
      END)::TEXT as description,
    pc.type::TEXT,
    pc.value,
    COALESCE(pc.min_order_value, 0),
    CASE 
      WHEN pc.type = 'percent_off' THEN v_sample_order_value * (pc.value / 100.0)
      ELSE LEAST(pc.value, v_sample_order_value)
    END as discount_amount,
    (pc.code = v_best_code) as is_best
  FROM promo_codes pc
  WHERE pc.is_active = TRUE
    AND (pc.start_date IS NULL OR pc.start_date <= CURRENT_TIMESTAMP)
    AND (pc.end_date IS NULL OR pc.end_date >= CURRENT_TIMESTAMP)
    AND (pc.max_uses IS NULL OR COALESCE(pc.uses_remaining, 0) > 0)
  ORDER BY
    is_best DESC,
    CASE WHEN pc.type = 'percent_off' THEN pc.value ELSE 0 END DESC,
    CASE WHEN pc.type = 'dollars_off' THEN pc.value ELSE 0 END DESC,
    COALESCE(pc.min_order_value, 0) ASC;
END;
$$;

-- Step 4: Ensure record_promo_code_usage function exists
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
  
  RETURN TRUE;
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'Error recording promo code usage: %', SQLERRM;
    RETURN FALSE;
END;
$$;

-- Step 5: Grant proper permissions
GRANT EXECUTE ON FUNCTION check_promo_code_validity TO anon, authenticated;
GRANT EXECUTE ON FUNCTION get_all_promo_codes TO anon, authenticated;
GRANT EXECUTE ON FUNCTION record_promo_code_usage TO anon, authenticated;

-- Step 6: Ensure SAVE10 promo code exists with correct data
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
  'SAVE10',
  '10% Off Any Order',
  'percent_off',
  10.00,
  0.00,
  NULL,
  NULL,
  '2024-01-01 00:00:00'::timestamp,
  '2025-12-31 23:59:59'::timestamp,
  TRUE,
  FALSE,
  NULL
)
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  type = EXCLUDED.type,
  value = EXCLUDED.value,
  min_order_value = EXCLUDED.min_order_value,
  start_date = EXCLUDED.start_date,
  end_date = EXCLUDED.end_date,
  is_active = EXCLUDED.is_active,
  uses_per_account_tracking = EXCLUDED.uses_per_account_tracking,
  max_uses_per_account = EXCLUDED.max_uses_per_account;

-- Step 7: Add a few more test promo codes for variety
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
) VALUES 
(
  'WELCOME15',
  '15% Off Welcome Discount',
  'percent_off',
  15.00,
  50.00,
  NULL,
  NULL,
  '2024-01-01 00:00:00'::timestamp,
  '2025-12-31 23:59:59'::timestamp,
  TRUE,
  TRUE,
  1
),
(
  'BULK25',
  '$25 Off Large Orders',
  'dollars_off',
  25.00,
  200.00,
  NULL,
  NULL,
  '2024-01-01 00:00:00'::timestamp,
  '2025-12-31 23:59:59'::timestamp,
  TRUE,
  FALSE,
  NULL
)
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  type = EXCLUDED.type,
  value = EXCLUDED.value,
  min_order_value = EXCLUDED.min_order_value,
  start_date = EXCLUDED.start_date,
  end_date = EXCLUDED.end_date,
  is_active = EXCLUDED.is_active,
  uses_per_account_tracking = EXCLUDED.uses_per_account_tracking,
  max_uses_per_account = EXCLUDED.max_uses_per_account;

-- Step 8: Test the function to ensure it works
DO $$
DECLARE
  test_result RECORD;
BEGIN
  -- Test SAVE10 with a sample order
  SELECT * INTO test_result 
  FROM check_promo_code_validity('SAVE10', '101', 100.00) 
  LIMIT 1;
  
  IF test_result.is_valid THEN
    RAISE NOTICE 'SUCCESS: SAVE10 validation test passed. Discount: %', test_result.discount_amount;
  ELSE
    RAISE NOTICE 'FAILED: SAVE10 validation test failed. Message: %', test_result.message;
  END IF;
END $$;

-- Final confirmation
SELECT 'PROMO CODE FIX COMPLETE - SAVE10 should now work!' as status;
