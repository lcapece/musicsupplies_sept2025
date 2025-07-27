-- Add per-account usage limits to promo_codes table
ALTER TABLE promo_codes
ADD COLUMN max_uses_per_account INTEGER DEFAULT NULL,
ADD COLUMN uses_per_account_tracking BOOLEAN DEFAULT FALSE,
ADD CONSTRAINT valid_per_account_uses CHECK (max_uses_per_account IS NULL OR max_uses_per_account > 0);

-- Create index to improve performance when checking usage
CREATE INDEX IF NOT EXISTS idx_promo_code_usage_account_promo
ON promo_code_usage(promo_code_id, account_number);

-- Update the check_promo_code_validity function to enforce per-account limits
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
      'Invalid or expired promo code.',
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
      'Order value does not meet minimum requirement of $' || v_promo.min_order_value::TEXT,
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
      'This promo code has reached its usage limit.',
      NULL::UUID,
      NULL::TEXT,
      NULL::DECIMAL,
      NULL::DECIMAL;
    RETURN;
  END IF;
  
  -- NEW: Check if account has reached its usage limit for this promo code
  IF v_promo.uses_per_account_tracking AND v_promo.max_uses_per_account IS NOT NULL THEN
    SELECT COUNT(*) INTO v_account_usage_count
    FROM promo_code_usage
    WHERE promo_code_id = v_promo.id
      AND account_number = p_account_number;
      
    IF v_account_usage_count >= v_promo.max_uses_per_account THEN
      RETURN QUERY SELECT 
        FALSE, 
        'You have already used this promo code the maximum number of times (' || v_promo.max_uses_per_account::TEXT || ').',
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
    'Promo code applied successfully: ' || v_promo.name,
    v_promo.id,
    v_promo.type,
    v_promo.value,
    v_discount_amount;
END;
$$;

-- Update the function to get available promo codes, including per-account usage
CREATE OR REPLACE FUNCTION get_available_promo_codes(
  p_account_number TEXT,
  p_order_value DECIMAL DEFAULT 0
)
RETURNS TABLE (
  code TEXT,
  name TEXT,
  description TEXT,
  type TEXT,
  value DECIMAL,
  min_order_value DECIMAL,
  is_best BOOLEAN,
  uses_remaining_for_account INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  WITH account_usage AS (
    SELECT 
      promo_code_id,
      COUNT(*) as times_used
    FROM promo_code_usage
    WHERE account_number = p_account_number
    GROUP BY promo_code_id
  )
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
    -- Best promo logic based on discount amount
    CASE 
      WHEN pc.type = 'percent_off' AND p_order_value >= pc.min_order_value THEN 
        RANK() OVER (ORDER BY pc.value DESC) = 1
      WHEN pc.type = 'dollars_off' AND p_order_value >= pc.min_order_value THEN
        RANK() OVER (ORDER BY pc.value DESC) = 1
      ELSE FALSE
    END as is_best,
    -- Compute remaining uses for this account
    CASE
      WHEN pc.uses_per_account_tracking AND pc.max_uses_per_account IS NOT NULL THEN
        pc.max_uses_per_account - COALESCE(au.times_used, 0)
      ELSE NULL
    END as uses_remaining_for_account
  FROM promo_codes pc
  LEFT JOIN account_usage au ON pc.id = au.promo_code_id
  WHERE pc.is_active = TRUE
    AND pc.start_date <= CURRENT_TIMESTAMP
    AND pc.end_date >= CURRENT_TIMESTAMP
    AND (pc.max_uses IS NULL OR pc.uses_remaining > 0)
    AND (
      -- Skip per-account limit check if not tracking per account
      NOT pc.uses_per_account_tracking
      OR
      -- Include if tracking but no max per account
      pc.max_uses_per_account IS NULL
      OR
      -- Include if tracking and under max per account
      (
        pc.max_uses_per_account > COALESCE(
          (SELECT times_used FROM account_usage WHERE promo_code_id = pc.id),
          0
        )
      )
    )
    AND (pc.min_order_value <= p_order_value OR p_order_value = 0)
  ORDER BY is_best DESC, pc.value DESC;
END;
$$;

-- Sample promo codes with per-account limits
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
    'ONETIME10', 
    'One-time 10% Off', 
    'percent_off', 
    10, 
    0, 
    NULL, 
    NULL, 
    CURRENT_TIMESTAMP, 
    CURRENT_TIMESTAMP + INTERVAL '90 days', 
    TRUE,
    1,
    TRUE
  ),
  (
    'LOYAL20', 
    'Loyalty 20% Off (Max 3 Uses)', 
    'percent_off', 
    20, 
    100, 
    NULL, 
    NULL, 
    CURRENT_TIMESTAMP, 
    CURRENT_TIMESTAMP + INTERVAL '60 days', 
    TRUE,
    3,
    TRUE
  );

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION get_available_promo_codes TO anon, authenticated;
