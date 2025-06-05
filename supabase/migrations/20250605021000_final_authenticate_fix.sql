/*
  # Final Authentication Function Fix
  
  Create a working authenticate function that handles both custom and default passwords correctly
*/

-- Drop existing function
DROP FUNCTION IF EXISTS authenticate_user_lcmd(p_account_number integer, p_password text);

-- Create the final working authenticate function
CREATE OR REPLACE FUNCTION authenticate_user_lcmd(p_account_number integer, p_password text)
RETURNS TABLE(
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
BEGIN
  -- First try custom password (logon_lcmd table)
  RETURN QUERY 
  SELECT 
    a.account_number,
    a.acct_name,
    COALESCE(a.address, '') as address,
    COALESCE(a.city, '') as city,
    COALESCE(a.state, '') as state,
    COALESCE(a.zip, '') as zip,
    a.id,
    COALESCE(a.email_address, a.contact, '') as email_address,
    COALESCE(a.mobile_phone, a.phone, '') as mobile_phone,
    COALESCE(a.requires_password_change, false) as requires_password_change
  FROM accounts_lcmd a
  INNER JOIN logon_lcmd l ON a.account_number = l.account_number
  WHERE a.account_number = p_account_number 
    AND l.password = crypt(p_password, l.password);
  
  -- If we found a result, return
  IF FOUND THEN
    RETURN;
  END IF;
  
  -- Try default password (accounts_lcmd table)
  RETURN QUERY 
  SELECT 
    a.account_number,
    a.acct_name,
    COALESCE(a.address, '') as address,
    COALESCE(a.city, '') as city,
    COALESCE(a.state, '') as state,
    COALESCE(a.zip, '') as zip,
    a.id,
    COALESCE(a.email_address, a.contact, '') as email_address,
    COALESCE(a.mobile_phone, a.phone, '') as mobile_phone,
    true as requires_password_change -- Always require change for default passwords
  FROM accounts_lcmd a
  WHERE a.account_number = p_account_number 
    AND LOWER(a.password) = LOWER(p_password)
    AND NOT EXISTS (SELECT 1 FROM logon_lcmd l WHERE l.account_number = p_account_number);
END;
$$;
