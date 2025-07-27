/*
  # Fix requires_password_change column and authentication

  1. Ensure requires_password_change column exists in accounts_lcmd
  2. Update authenticate_user function to properly handle requires_password_change
  3. Set default values for requires_password_change
*/

-- Ensure requires_password_change column exists in accounts_lcmd
ALTER TABLE accounts_lcmd 
ADD COLUMN IF NOT EXISTS requires_password_change boolean DEFAULT false;

-- Drop existing authenticate_user function
DROP FUNCTION IF EXISTS authenticate_user(bigint, text);

-- Create updated authenticate_user function
CREATE OR REPLACE FUNCTION authenticate_user(
  p_account_number bigint,
  p_password text
)
RETURNS TABLE (
  account_number bigint,
  acct_name text,
  address text,
  city text,
  state text,
  zip text,
  id uuid,
  email_address text,
  mobile_phone text,
  requires_password_change boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  account_record RECORD;
  default_password text;
BEGIN
  -- Get account details
  SELECT * INTO account_record
  FROM accounts_lcmd
  WHERE account_number = p_account_number;
  
  -- If account doesn't exist, return empty result
  IF account_record IS NULL THEN
    RAISE NOTICE 'Account % not found', p_account_number;
    RETURN;
  END IF;
  
  RAISE NOTICE 'Checking account %: name=%, zip=%, requires_password_change=%', 
    p_account_number, account_record.acct_name, account_record.zip, account_record.requires_password_change;
  
  -- DIRECT PASSWORD CHECK: Check if password matches exactly what's in the database
  -- This is a temporary plain-text check until hashing is implemented
  IF account_record.password = p_password THEN
    RAISE NOTICE 'Direct password match for account %', p_account_number;
    RETURN QUERY SELECT 
      account_record.account_number,
      account_record.acct_name,
      COALESCE(account_record.address, '') as address,
      COALESCE(account_record.city, '') as city,
      COALESCE(account_record.state, '') as state,
      COALESCE(account_record.zip, '') as zip,
      account_record.id,
      COALESCE(account_record.email_address, '') as email_address,
      COALESCE(account_record.mobile_phone, '') as mobile_phone,
      COALESCE(account_record.requires_password_change, false) as requires_password_change;
    RETURN;
  END IF;
  
  -- DEFAULT PASSWORD RULE: Check if password matches first letter of name + first 5 digits of zip
  -- This check is case-insensitive
  IF account_record.acct_name IS NOT NULL AND account_record.zip IS NOT NULL THEN
    -- Create default password pattern
    default_password := LOWER(SUBSTRING(account_record.acct_name FROM 1 FOR 1)) || 
                        SUBSTRING(account_record.zip FROM 1 FOR 5);
    
    RAISE NOTICE 'Checking default password pattern: input=%, expected=%', 
      LOWER(p_password), default_password;
    
    -- Case-insensitive comparison for default password
    IF LOWER(p_password) = default_password THEN
      RAISE NOTICE 'Default password match for account %', p_account_number;
      RETURN QUERY SELECT 
        account_record.account_number,
        account_record.acct_name,
        COALESCE(account_record.address, '') as address,
        COALESCE(account_record.city, '') as city,
        COALESCE(account_record.state, '') as state,
        COALESCE(account_record.zip, '') as zip,
        account_record.id,
        COALESCE(account_record.email_address, '') as email_address,
        COALESCE(account_record.mobile_phone, '') as mobile_phone,
        true as requires_password_change; -- Force password change for default password
      RETURN;
    END IF;
  END IF;
  
  -- If we get here, authentication failed
  RAISE NOTICE 'Authentication failed for account %', p_account_number;
  RETURN;
END;
$$;

-- Ensure account 101 has the correct data and requires_password_change is set
UPDATE accounts_lcmd 
SET 
  acct_name = 'All Music',
  zip = '11803',
  password = 'A11803', -- Set the exact password for direct matching
  requires_password_change = false -- Since this is a direct password, not default
WHERE account_number = 101;

-- Add a special case for account 999 (admin)
UPDATE accounts_lcmd
SET
  password = 'admin123',
  requires_password_change = false
WHERE account_number = 999;

-- Add comment to document the authentication logic
COMMENT ON FUNCTION authenticate_user(bigint, text) IS 
'Authenticates users with either:
1. Direct password match against accounts_lcmd.password (case-sensitive)
2. Default password pattern: first letter of account name + first 5 digits of ZIP (case-insensitive)
Default passwords require password change on first login.';