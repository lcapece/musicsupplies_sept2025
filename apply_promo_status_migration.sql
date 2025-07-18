-- Apply the promo code status tracking migration to hosted database
-- This ensures the get_all_promo_codes_with_status function is available

-- First, let's check if the function exists
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_proc 
        WHERE proname = 'get_all_promo_codes_with_status'
    ) THEN
        RAISE NOTICE 'Function get_all_promo_codes_with_status does not exist. Need to apply migration.';
    ELSE
        RAISE NOTICE 'Function get_all_promo_codes_with_status already exists.';
    END IF;
END $$;

-- Apply the complete migration from 20250717_add_promo_code_status_tracking.sql
-- Status tracking for promo codes with comprehensive status information

-- Create the main function to get all promo codes with status
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
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    pc.code,
    pc.name,
    pc.description,
    pc.type,
    pc.value,
    pc.min_order_value,
    pc.is_best,
    CASE 
      WHEN pc.max_uses_per_account IS NULL THEN NULL
      ELSE pc.max_uses_per_account - COALESCE(
        (SELECT COUNT(*) FROM promo_code_usage pcu WHERE pcu.promo_code = pc.code AND pcu.account_number = p_account_number), 
        0
      )
    END as uses_remaining_for_account,
    CASE
      -- Check if code is disabled
      WHEN NOT pc.is_active THEN 'disabled'
      -- Check if code has expired by date
      WHEN pc.end_date IS NOT NULL AND pc.end_date < CURRENT_DATE THEN 'expired_date'
      -- Check if code is not yet active
      WHEN pc.start_date IS NOT NULL AND pc.start_date > CURRENT_DATE THEN 'not_active'
      -- Check if code has reached global usage limit
      WHEN pc.max_uses IS NOT NULL AND (
        SELECT COUNT(*) FROM promo_code_usage pcu WHERE pcu.promo_code = pc.code
      ) >= pc.max_uses THEN 'expired_global'
      -- Check if account has used up their allocation
      WHEN pc.max_uses_per_account IS NOT NULL AND (
        SELECT COUNT(*) FROM promo_code_usage pcu 
        WHERE pcu.promo_code = pc.code AND pcu.account_number = p_account_number
      ) >= pc.max_uses_per_account THEN 'expired'
      -- Check if minimum order value is not met
      WHEN pc.min_order_value > p_order_value THEN 'min_not_met'
      -- Code is available for use
      ELSE 'available'
    END as status
  FROM promo_codes pc
  WHERE pc.applicable_accounts IS NULL 
     OR pc.applicable_accounts = '' 
     OR p_account_number = ANY(string_to_array(pc.applicable_accounts, ','))
  ORDER BY 
    pc.is_best DESC,
    pc.value DESC,
    pc.code;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create helper function for available codes only
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
) AS $$
BEGIN
  RETURN QUERY
  SELECT * FROM get_all_promo_codes_with_status(p_account_number, p_order_value)
  WHERE get_all_promo_codes_with_status.status IN ('available', 'min_not_met');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions
GRANT EXECUTE ON FUNCTION get_available_promo_codes_with_status TO anon, authenticated;
GRANT EXECUTE ON FUNCTION get_all_promo_codes_with_status TO anon, authenticated;

-- Test the function
DO $$
DECLARE
    test_result RECORD;
BEGIN
    -- Test with account 101
    SELECT COUNT(*) as code_count INTO test_result
    FROM get_all_promo_codes_with_status('101', 100.00);
    
    RAISE NOTICE 'Test completed. Found % promo codes for account 101', test_result.code_count;
END $$;
