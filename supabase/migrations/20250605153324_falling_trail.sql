/*
  # Fix account 101 data to match expected values

  1. Updates
    - Update account 101 to have correct acct_name and zip
    - Insert password "Monday123$" into logon_lcmd for account 101
*/

-- Update account 101 with correct data
UPDATE accounts_lcmd 
SET 
  acct_name = 'All Music',
  zip = '11803',
  address = '123 Main St',
  city = 'Springfield',
  state = 'IL'
WHERE account_number = 101;

-- Check if logon_lcmd table has updated_at column
DO $$
DECLARE
  has_updated_at BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT FROM information_schema.columns 
    WHERE table_name = 'logon_lcmd' AND column_name = 'updated_at'
  ) INTO has_updated_at;
  
  IF has_updated_at THEN
    -- Insert with updated_at if column exists
    EXECUTE 'INSERT INTO logon_lcmd (account_number, password, created_at, updated_at)
             VALUES (101, ''Monday123$'', now(), now())
             ON CONFLICT (account_number) 
             DO UPDATE SET 
               password = EXCLUDED.password,
               updated_at = now()';
  ELSE
    -- Insert without updated_at if column doesn't exist
    EXECUTE 'INSERT INTO logon_lcmd (account_number, password, created_at)
             VALUES (101, ''Monday123$'', now())
             ON CONFLICT (account_number) 
             DO UPDATE SET 
               password = EXCLUDED.password';
  END IF;
END $$;

-- Also update the test table for consistency
UPDATE accounts_lcmd_test 
SET 
  acct_name = 'All Music',
  zip = '11803',
  password = 'Monday123$'
WHERE account_number = 101;