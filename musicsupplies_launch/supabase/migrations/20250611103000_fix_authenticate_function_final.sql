/*
  # Fix authenticate function final - properly match table structure
  
  Complete recreation of the authenticate function to match actual table structure
*/

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
DECLARE
  v_stored_password text;
  v_acct_name text;
  v_zip text;
  v_default_password text;
  v_requires_password_change boolean;
BEGIN
  -- Fetch account details and stored password from accounts_lcmd
  SELECT a.password, a.acct_name, a.zip
  INTO v_stored_password, v_acct_name, v_zip
  FROM accounts_lcmd a
  WHERE a.account_number = p_account_number;

  -- If account not found, return no rows
  IF v_stored_password IS NULL THEN
    RETURN;
  END IF;

  -- Calculate default password
  v_default_password := LOWER(SUBSTRING(v_acct_name FROM 1 FOR 1) || SUBSTRING(v_zip FROM 1 FOR 5));

  -- Check if provided password matches default password (case-insensitive)
  IF LOWER(p_password) = v_default_password THEN
    v_requires_password_change := TRUE;
  ELSIF LOWER(v_stored_password) = LOWER(p_password) THEN
    v_requires_password_change := FALSE;
  ELSE
    -- If neither matches, authentication fails
    RETURN;
  END IF;

  -- Return the authenticated user data
  RETURN QUERY
  SELECT
    a.account_number::bigint,
    COALESCE(a.acct_name, '')::text,
    COALESCE(a.address, '')::text,
    COALESCE(a.city, '')::text,
    COALESCE(a.state, '')::text,
    COALESCE(a.zip, '')::text,
    a.account_number::bigint as id,  -- Use account_number as id
    COALESCE(a.email_address, '')::text,       
    COALESCE(a.mobile_phone, '')::text,        
    v_requires_password_change
  FROM accounts_lcmd a
  WHERE a.account_number = p_account_number;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION authenticate_user_lcmd(integer, text) TO anon, authenticated;
