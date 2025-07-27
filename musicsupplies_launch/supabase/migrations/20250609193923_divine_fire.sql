/*
  # Fix Password Authentication Logic
  
  1. Updates
    - Modify authenticate_user function to handle case-insensitive default password checks
    - Ensure default password pattern works with first letter + first 5 digits of ZIP
    - Store passwords as plain text temporarily (hashing postponed)
    - Special handling for account 101 with password "A11803"
*/

-- Drop existing authenticate_user function
DROP FUNCTION IF EXISTS authenticate_user(p_account_number BIGINT, p_password TEXT);

-- Create updated authenticate_user function with case-insensitive default password check
CREATE OR REPLACE FUNCTION authenticate_user(
  p_account_number BIGINT,
  p_password TEXT
)
RETURNS TABLE (
  account_number BIGINT,
  acct_name TEXT,
  address TEXT,
  city TEXT,
  state TEXT,
  zip TEXT,
  id UUID,
  email_address TEXT,
  mobile_phone TEXT,
  requires_password_change BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  account_record public.accounts_lcmd%ROWTYPE;
  expected_default_password TEXT;
  zip_first_five TEXT;
  first_letter TEXT;
BEGIN
  -- Get account details
  SELECT * INTO account_record
  FROM public.accounts_lcmd a
  WHERE a.account_number = p_account_number;

  -- If account doesn't exist, return empty
  IF account_record IS NULL THEN
    RAISE NOTICE 'Account % not found', p_account_number;
    RETURN;
  END IF;

  -- First check if the account has a stored password
  IF account_record.password IS NOT NULL THEN
    -- For stored passwords, first try exact match (case-sensitive)
    IF account_record.password = p_password THEN
      RAISE NOTICE 'Password matched exactly for account %', p_account_number;
      RETURN QUERY SELECT
        account_record.account_number,
        account_record.acct_name,
        COALESCE(account_record.address, '') AS address,
        COALESCE(account_record.city, '') AS city,
        COALESCE(account_record.state, '') AS state,
        COALESCE(account_record.zip, '') AS zip,
        account_record.id,
        COALESCE(account_record.email_address, account_record.contact, '') AS email_address,
        COALESCE(account_record.mobile_phone, account_record.phone, '') AS mobile_phone,
        COALESCE(account_record.requires_password_change, FALSE) AS requires_password_change;
      RETURN;
    END IF;
  END IF;

  -- Check for default password pattern: first letter of acct_name + first 5 digits of zip
  -- This check is CASE INSENSITIVE
  IF account_record.acct_name IS NOT NULL AND account_record.zip IS NOT NULL THEN
    -- Extract first letter of account name
    first_letter := substring(account_record.acct_name FROM 1 FOR 1);
    
    -- Extract first 5 digits of ZIP code (remove any non-digits)
    zip_first_five := substring(regexp_replace(account_record.zip, '[^0-9]', '', 'g') FROM 1 FOR 5);
    
    -- Create expected default password
    expected_default_password := first_letter || zip_first_five;
    
    RAISE NOTICE 'Checking default password pattern for account %: expected="%", provided="%"', 
      p_account_number, expected_default_password, p_password;
    
    -- Compare provided password with expected default password (CASE INSENSITIVE)
    IF LOWER(p_password) = LOWER(expected_default_password) THEN
      RAISE NOTICE 'Default password pattern matched for account %', p_account_number;
      RETURN QUERY SELECT
        account_record.account_number,
        account_record.acct_name,
        COALESCE(account_record.address, '') AS address,
        COALESCE(account_record.city, '') AS city,
        COALESCE(account_record.state, '') AS state,
        COALESCE(account_record.zip, '') AS zip,
        account_record.id,
        COALESCE(account_record.email_address, account_record.contact, '') AS email_address,
        COALESCE(account_record.mobile_phone, account_record.phone, '') AS mobile_phone,
        TRUE AS requires_password_change; -- Force change if logging in with default
      RETURN;
    END IF;
  END IF;

  -- If we reach here, authentication failed
  RAISE NOTICE 'Authentication failed for account %', p_account_number;
  RETURN;
END;
$$;

-- Update account 101 to ensure it works with "A11803" password
UPDATE accounts_lcmd
SET password = 'A11803'
WHERE account_number = 101;

-- Add comment to document the authentication logic
COMMENT ON FUNCTION authenticate_user(BIGINT, TEXT) IS 
'Authenticates a user based on account number and password. 
For default passwords (first letter of account name + first 5 digits of ZIP), 
the comparison is CASE INSENSITIVE. For stored passwords, the comparison is exact match.
Passwords are temporarily stored as plain text until hashing implementation is ready.';

-- Create or replace update_user_password function to store plain text passwords
CREATE OR REPLACE FUNCTION update_user_password(
  p_account_number BIGINT,
  p_new_password TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Ensure p_new_password is not empty or too short (basic validation)
  IF p_new_password IS NULL OR length(p_new_password) < 6 THEN
    RAISE EXCEPTION 'Password must be at least 6 characters long.';
    RETURN FALSE;
  END IF;

  -- Update password and flag in accounts_LCMD (store as plain text for now)
  UPDATE public.accounts_lcmd
  SET
    password = p_new_password, -- Store as plain text temporarily
    requires_password_change = FALSE,
    updated_at = NOW()
  WHERE account_number = p_account_number;

  IF FOUND THEN
    RETURN TRUE;
  ELSE
    -- Account not found
    RAISE WARNING 'Account not found for password update: %', p_account_number;
    RETURN FALSE;
  END IF;

EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'Error updating password for account %: %', p_account_number, SQLERRM;
    RETURN FALSE;
END;
$$;

-- Add comment to document the password update function
COMMENT ON FUNCTION update_user_password(BIGINT, TEXT) IS 
'Updates the user''s password in accounts_LCMD as plain text (temporarily) 
and sets requires_password_change to false.';