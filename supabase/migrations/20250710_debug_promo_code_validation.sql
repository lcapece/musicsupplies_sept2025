-- Debug and fix promo code validation issues

-- First, let's ensure the promo codes table has proper RLS policies
-- Drop existing restrictive policies if they exist
DROP POLICY IF EXISTS "Users can view promo codes" ON promo_codes;
DROP POLICY IF EXISTS "Users can view promo codes for their account" ON promo_codes;

-- Create a simple policy that allows reading promo codes for validation
CREATE POLICY "Allow promo code validation" ON promo_codes FOR SELECT USING (is_active = true);

-- Ensure the table is accessible for RLS
ALTER TABLE promo_codes ENABLE ROW LEVEL SECURITY;

-- Also ensure promo_code_usage table is accessible
DROP POLICY IF EXISTS "Users can view their promo code usage" ON promo_code_usage;
CREATE POLICY "Allow promo code usage lookup" ON promo_code_usage FOR SELECT USING (true);
ALTER TABLE promo_code_usage ENABLE ROW LEVEL SECURITY;

-- Create an improved validation function with better error handling
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

-- Grant proper permissions
GRANT EXECUTE ON FUNCTION check_promo_code_validity TO anon, authenticated;

-- Insert test data if it doesn't exist
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
