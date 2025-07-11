-- Ensure we have the record_promo_code_usage function

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

-- Grant permissions
GRANT EXECUTE ON FUNCTION record_promo_code_usage TO anon, authenticated;

-- Also create a simple debug function to test promo code validation
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
