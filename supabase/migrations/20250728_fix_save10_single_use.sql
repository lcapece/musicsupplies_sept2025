-- URGENT FIX: Enable single-use enforcement for SAVE10 promo code
-- This promo code has been used multiple times by the same accounts

-- Update SAVE10 to be single-use per account
UPDATE promo_codes 
SET 
  uses_per_account_tracking = true,
  max_uses_per_account = 1
WHERE code = 'SAVE10';

-- Verify other commonly used promo codes
UPDATE promo_codes 
SET 
  uses_per_account_tracking = true,
  max_uses_per_account = 1
WHERE code IN ('SAVE10', 'SAVE20', 'SAVE25') 
  AND (uses_per_account_tracking = false OR uses_per_account_tracking IS NULL);

-- Log the fix
DO $$
BEGIN
  RAISE NOTICE 'SAVE10 promo code fixed to single-use per account at %', NOW();
END $$;

-- Show updated promo codes
SELECT code, name, type, value, uses_per_account_tracking, max_uses_per_account 
FROM promo_codes 
WHERE code IN ('SAVE10', 'SAVE20', 'SAVE25');
