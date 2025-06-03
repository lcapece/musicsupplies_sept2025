/*
  # Fix requires_password_change returning null
  
  Update the authenticate_user_lcmd function to ensure requires_password_change
  always returns a boolean value (false instead of null for users with passwords)
*/

-- Update the authentication function to properly return false instead of null
CREATE OR REPLACE FUNCTION authenticate_user_lcmd(
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
  expected_default_password text;
  logon_record RECORD;
BEGIN
  -- First, get the account details from accounts_lcmd
  SELECT * INTO account_record
  FROM accounts_lcmd a
  WHERE a.account_number = p_account_number;
  
  -- If account doesn't exist, return empty result
  IF account_record IS NULL THEN
    RETURN;
  END IF;
  
  -- Check if account has a hashed password in logon_lcmd table
  SELECT * INTO logon_record
  FROM logon_lcmd l
  WHERE l.account_number = p_account_number;
  
  -- If found in logon_lcmd, validate against stored hashed password (case sensitive)
  IF logon_record IS NOT NULL THEN
    -- Use crypt() to verify password against stored hash
    IF logon_record.password = crypt(p_password, logon_record.password) THEN
      -- Password matches, return account data with no password change required
      RETURN QUERY SELECT 
        account_record.account_number,
        account_record.acct_name,
        account_record.address,
        account_record.city,
        account_record.state,
        account_record.zip,
        account_record.id,
        account_record.email_address,
        account_record.mobile_phone,
        false::boolean as requires_password_change;  -- Explicitly cast to boolean
    END IF;
    -- If password doesn't match, return empty (invalid login)
    RETURN;
  END IF;
  
  -- If not in logon_lcmd, check if password matches default pattern
  -- Default pattern: first letter of account name + full zip code (case insensitive for default passwords only)
  IF account_record.acct_name IS NOT NULL AND account_record.zip IS NOT NULL THEN
    -- Create expected default password: first letter of account name + full zip code
    expected_default_password := lower(substring(account_record.acct_name from 1 for 1)) || lower(account_record.zip);
    
    -- Compare provided password (lowercased) with expected default password
    IF lower(p_password) = expected_default_password THEN
      -- Default password matches, return account data with password change required
      RETURN QUERY SELECT 
        account_record.account_number,
        account_record.acct_name,
        account_record.address,
        account_record.city,
        account_record.state,
        account_record.zip,
        account_record.id,
        account_record.email_address,
        account_record.mobile_phone,
        true::boolean as requires_password_change;  -- Explicitly cast to boolean
    END IF;
  END IF;
  
  -- If we get here, authentication failed
  RETURN;
END;
$$;
