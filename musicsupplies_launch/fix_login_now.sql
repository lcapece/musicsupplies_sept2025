-- Run this directly in your Supabase SQL Editor to fix the login function

-- Drop any existing functions completely
DROP FUNCTION IF EXISTS authenticate_user_lcmd(integer, text);
DROP FUNCTION IF EXISTS authenticate_user_lcmd(bigint, text);
DROP FUNCTION IF EXISTS authenticate_user(integer, text);
DROP FUNCTION IF EXISTS authenticate_user(bigint, text);

-- Create the correct authenticate function matching actual table structure
CREATE OR REPLACE FUNCTION authenticate_user_lcmd(p_account_number integer, p_password text)
RETURNS TABLE(
  account_number bigint, 
  acct_name text, 
  address text, 
  city text, 
  state text, 
  zip text, 
  id bigint, 
  email_address text, 
  mobile_phone text, 
  requires_password_change boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    a.account_number::bigint,
    COALESCE(a.acct_name, '')::text,
    COALESCE(a.address, '')::text,
    COALESCE(a.city, '')::text,
    COALESCE(a.state, '')::text,
    COALESCE(a.zip, '')::text,
    a.account_number::bigint as id,
    ''::text as email_address,
    ''::text as mobile_phone,
    true as requires_password_change
  FROM accounts_lcmd a
  WHERE a.account_number = p_account_number
    AND LOWER(a.password) = LOWER(p_password);
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION authenticate_user_lcmd(integer, text) TO anon, authenticated;

-- Also update the password for account 101 to match what you confirmed
UPDATE accounts_lcmd 
SET password = 'A11803'
WHERE account_number = 101;
