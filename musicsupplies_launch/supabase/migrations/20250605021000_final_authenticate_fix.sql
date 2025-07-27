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
    a.account_number,
    COALESCE(a.acct_name, '') as acct_name,
    COALESCE(a.address, '') as address,
    COALESCE(a.city, '') as city,
    COALESCE(a.state, '') as state,
    COALESCE(a.zip, '') as zip,
    a.account_number as id, -- Use account_number as id since there's no separate id field
    '' as email_address, -- Empty string since email_address field doesn't exist
    '' as mobile_phone, -- Empty string since mobile_phone field doesn't exist
    true as requires_password_change
  FROM accounts_lcmd a
  WHERE a.account_number = p_account_number
    AND LOWER(a.password) = LOWER(p_password);
END;
$$;
