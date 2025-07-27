-- Drop the existing function to recreate it with updated parameters and logic
DROP FUNCTION IF EXISTS authenticate_user_lcmd(integer, text);

-- Create the authenticate_user_lcmd function to allow login by account_number (bigint) or email_address (text)
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
  v_stored_password text;
  v_acct_name text;
  v_zip text;
  v_default_password text;
  v_requires_password_change boolean;
  v_account_number bigint;
BEGIN
  -- Try to convert p_identifier to a bigint (account number)
  BEGIN
    v_account_number := p_identifier::bigint;
  EXCEPTION
    WHEN invalid_text_representation THEN
      v_account_number := NULL; -- Not a valid account number, treat as email
  END;

  -- Fetch account details based on whether p_identifier is an account number or email
  IF v_account_number IS NOT NULL THEN
    -- Authenticate by account number
    SELECT a.password, a.acct_name, a.zip, a.account_number
    INTO v_stored_password, v_acct_name, v_zip, v_account_number
    FROM accounts_lcmd a
    WHERE a.account_number = v_account_number;
  ELSE
    -- Authenticate by email address
    SELECT a.password, a.acct_name, a.zip, a.account_number
    INTO v_stored_password, v_acct_name, v_zip, v_account_number
    FROM accounts_lcmd a
    WHERE a.email_address = p_identifier;
  END IF;

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
  WHERE a.account_number = v_account_number; -- Use the resolved v_account_number
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION authenticate_user_lcmd(text, text) TO anon, authenticated;
