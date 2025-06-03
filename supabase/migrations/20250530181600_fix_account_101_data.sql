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

-- Insert the known password for account 101 into logon_lcmd
INSERT INTO logon_lcmd (account_number, password, created_at, updated_at)
VALUES (101, 'Monday123$', now(), now())
ON CONFLICT (account_number) 
DO UPDATE SET 
  password = EXCLUDED.password,
  updated_at = now();

-- Also update the test table for consistency
UPDATE accounts_lcmd_test 
SET 
  acct_name = 'All Music',
  zip = '11803',
  password = 'Monday123$'
WHERE account_number = 101;
