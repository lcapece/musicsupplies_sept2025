/*
  # Update authentication function to support email login
  
  Modify the authenticate_user_lcmd function to accept either an account number or email address
  as the identifier, while maintaining the default password detection logic.
*/

-- Drop the existing function
DROP FUNCTION IF EXISTS authenticate_user_lcmd(integer, text);

-- Create the updated function with string identifier input
CREATE OR REPLACE FUNCTION authenticate_user_lcmd(p_identifier text, p_password text)
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
  v_account_number bigint;
  v_stored_password text;
  v_acct_name text;
  v_zip text;
  v_default_password text;
  v_requires_password_change boolean;
BEGIN
  -- Determine if identifier is an account number or email address
  IF p_identifier ~ '^[0-9]+$' THEN
    -- Identifier is numeric, treat as account number
    SELECT a.account_number, a.password, a.acct_name, a.zip
    INTO v_account_number, v_stored_password, v_acct_name, v_zip
    FROM accounts_lcmd a
    WHERE a.account_number = p_identifier::bigint;
  ELSE
    -- Identifier is not numeric, treat as email address
    SELECT a.account_number, a.password, a.acct_name, a.zip
    INTO v_account_number, v_stored_password, v_acct_name, v_zip
    FROM accounts_lcmd a
    WHERE LOWER(a.email_address) = LOWER(p_identifier);
  END IF;

  -- If account not found, return no rows
  IF v_account_number IS NULL THEN
    RETURN;
  END IF;

  -- Calculate default password (first letter of account name + first 5 digits of zip code)
  IF v_acct_name IS NOT NULL AND v_zip IS NOT NULL THEN
    v_default_password := LOWER(SUBSTRING(v_acct_name FROM 1 FOR 1) || SUBSTRING(v_zip FROM 1 FOR 5));
  ELSE
    v_default_password := NULL;
  END IF;

  -- Check if provided password matches default password (case-insensitive)
  IF v_default_password IS NOT NULL AND LOWER(p_password) = v_default_password THEN
    v_requires_password_change := TRUE;
  ELSIF v_stored_password IS NOT NULL AND LOWER(v_stored_password) = LOWER(p_password) THEN
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
  WHERE a.account_number = v_account_number;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION authenticate_user_lcmd(text, text) TO anon, authenticated;
