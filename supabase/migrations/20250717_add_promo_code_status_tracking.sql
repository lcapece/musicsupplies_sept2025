-- Add promo code status tracking functionality
-- This migration enhances the existing promo code system to include status information

-- Update the get_available_promo_codes function to include status information
CREATE OR REPLACE FUNCTION get_available_promo_codes_with_status(
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
  uses_remaining_for_account INTEGER,
  status TEXT
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
    -- Best promo logic based on discount amount for available codes only
    CASE 
      WHEN pc.type = 'percent_off' AND p_order_value >= pc.min_order_value 
           AND pc.is_active = TRUE 
           AND pc.start_date <= CURRENT_TIMESTAMP 
           AND pc.end_date >= CURRENT_TIMESTAMP
           AND (pc.max_uses IS NULL OR pc.uses_remaining > 0)
           AND (
             NOT pc.uses_per_account_tracking
             OR pc.max_uses_per_account IS NULL
             OR pc.max_uses_per_account > COALESCE(au.times_used, 0)
           ) THEN 
        RANK() OVER (
          ORDER BY 
            CASE WHEN pc.type = 'percent_off' THEN pc.value * p_order_value / 100 ELSE pc.value END DESC
        ) = 1
      WHEN pc.type = 'dollars_off' AND p_order_value >= pc.min_order_value 
           AND pc.is_active = TRUE 
           AND pc.start_date <= CURRENT_TIMESTAMP 
           AND pc.end_date >= CURRENT_TIMESTAMP
           AND (pc.max_uses IS NULL OR pc.uses_remaining > 0)
           AND (
             NOT pc.uses_per_account_tracking
             OR pc.max_uses_per_account IS NULL
             OR pc.max_uses_per_account > COALESCE(au.times_used, 0)
           ) THEN
        RANK() OVER (
          ORDER BY 
            CASE WHEN pc.type = 'percent_off' THEN pc.value * p_order_value / 100 ELSE pc.value END DESC
        ) = 1
      ELSE FALSE
    END as is_best,
    -- Compute remaining uses for this account
    CASE
      WHEN pc.uses_per_account_tracking AND pc.max_uses_per_account IS NOT NULL THEN
        pc.max_uses_per_account - COALESCE(au.times_used, 0)
      ELSE NULL
    END as uses_remaining_for_account,
    -- Determine status
    CASE
      -- Check if code has expired by date
      WHEN pc.end_date < CURRENT_TIMESTAMP THEN 'expired_date'
      -- Check if code is not yet active
      WHEN pc.start_date > CURRENT_TIMESTAMP THEN 'not_active'
      -- Check if code is globally disabled
      WHEN pc.is_active = FALSE THEN 'disabled'
      -- Check if global usage limit reached
      WHEN pc.max_uses IS NOT NULL AND pc.uses_remaining <= 0 THEN 'expired_global'
      -- Check if account-specific usage limit reached
      WHEN pc.uses_per_account_tracking 
           AND pc.max_uses_per_account IS NOT NULL 
           AND pc.max_uses_per_account <= COALESCE(au.times_used, 0) THEN 'expired'
      -- Check if minimum order value not met
      WHEN p_order_value > 0 AND p_order_value < pc.min_order_value THEN 'min_not_met'
      -- Otherwise available
      ELSE 'available'
    END as status
  FROM promo_codes pc
  LEFT JOIN account_usage au ON pc.id = au.promo_code_id
  ORDER BY 
    -- Available codes first
    CASE 
      WHEN pc.end_date >= CURRENT_TIMESTAMP 
           AND pc.start_date <= CURRENT_TIMESTAMP
           AND pc.is_active = TRUE
           AND (pc.max_uses IS NULL OR pc.uses_remaining > 0)
           AND (
             NOT pc.uses_per_account_tracking
             OR pc.max_uses_per_account IS NULL
             OR pc.max_uses_per_account > COALESCE(au.times_used, 0)
           ) THEN 0
      ELSE 1
    END,
    is_best DESC, 
    pc.value DESC;
END;
$$;

-- Update the existing get_available_promo_codes function to use the new one for backward compatibility
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
  SELECT 
    s.code,
    s.name,
    s.description,
    s.type,
    s.value,
    s.min_order_value,
    s.is_best,
    s.uses_remaining_for_account
  FROM get_available_promo_codes_with_status(p_account_number, p_order_value) s
  WHERE s.status = 'available' OR s.status = 'min_not_met';
END;
$$;

-- Create a function to get all promo codes (including expired ones) with status
CREATE OR REPLACE FUNCTION get_all_promo_codes_with_status(
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
  uses_remaining_for_account INTEGER,
  status TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT * FROM get_available_promo_codes_with_status(p_account_number, p_order_value);
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION get_available_promo_codes_with_status TO anon, authenticated;
GRANT EXECUTE ON FUNCTION get_all_promo_codes_with_status TO anon, authenticated;

-- Add some test data to demonstrate the functionality
-- Insert a one-time use promo code that will show as expired after first use
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
    'FIRSTTIME5', 
    'First Time Customer 5% Off', 
    'percent_off', 
    5, 
    0, 
    NULL, 
    NULL, 
    CURRENT_TIMESTAMP, 
    CURRENT_TIMESTAMP + INTERVAL '30 days', 
    TRUE,
    1,  -- One time use per account
    TRUE
  ),
  (
    'EXPIRED10', 
    'Expired 10% Off (Test)', 
    'percent_off', 
    10, 
    0, 
    NULL, 
    NULL, 
    CURRENT_TIMESTAMP - INTERVAL '60 days', 
    CURRENT_TIMESTAMP - INTERVAL '30 days',  -- Already expired
    TRUE,
    1,
    TRUE
  )
ON CONFLICT (code) DO NOTHING;
