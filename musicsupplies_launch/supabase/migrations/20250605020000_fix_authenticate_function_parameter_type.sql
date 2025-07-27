/*
  # Fix authenticate_user_lcmd function parameter type
  
  Change p_account_number from bigint to integer to match JavaScript number types
*/

-- Drop the current function
DROP FUNCTION IF EXISTS authenticate_user_lcmd(p_account_number bigint, p_password text);

-- Recreate with integer parameter type
CREATE OR REPLACE FUNCTION authenticate_user_lcmd(p_account_number integer, p_password text)
RETURNS TABLE(account_number bigint, acct_name text, address text, city text, state text, zip text, id uuid, email_address text, mobile_phone text, requires_password_change boolean)
LANGUAGE plpgsql
AS $$
DECLARE
  account_record RECORD;
  logon_record RECORD;
  hash_matches boolean := false;
BEGIN
  SELECT * INTO account_record FROM accounts_lcmd WHERE accounts_lcmd.account_number = p_account_number;
  
  IF account_record IS NULL THEN
    RAISE NOTICE 'No account found for %', p_account_number;
    RETURN;
  END IF;
  
  SELECT * INTO logon_record FROM logon_lcmd WHERE logon_lcmd.account_number = p_account_number;
  
  IF logon_record IS NOT NULL THEN
    RAISE NOTICE 'Found custom password for account %', p_account_number;
    hash_matches := (logon_record.password = crypt(p_password, logon_record.password));
    RAISE NOTICE 'Hash matches: %', hash_matches;
    
    IF hash_matches THEN
      RAISE NOTICE 'Custom password verified successfully';
      RETURN QUERY SELECT 
        account_record.account_number,
        account_record.acct_name,
        account_record.address,
        account_record.city,
        account_record.state,
        account_record.zip,
        account_record.id, -- Use the actual id from account_record instead of generating new one
        COALESCE(account_record.email_address, account_record.contact, '') as email_address,
        COALESCE(account_record.mobile_phone, account_record.phone, '') as mobile_phone,
        COALESCE(account_record.requires_password_change, false) as requires_password_change; -- FIX: Use actual value from DB
      RETURN;
    END IF;
  END IF;
  
  RAISE NOTICE 'Checking default password for account %', p_account_number;
  IF LOWER(account_record.password) = LOWER(p_password) THEN
    RAISE NOTICE 'Default password verified successfully';
    RETURN QUERY SELECT 
      account_record.account_number,
      account_record.acct_name,
      account_record.address,
      account_record.city,
      account_record.state,
      account_record.zip,
      account_record.id, -- Use the actual id from account_record
      COALESCE(account_record.email_address, account_record.contact, '') as email_address,
      COALESCE(account_record.mobile_phone, account_record.phone, '') as mobile_phone,
      true as requires_password_change; -- For default password, always require change
  ELSE
    RAISE NOTICE 'Default password does not match';
  END IF;
END;
$$;
