/*
  EMERGENCY FIX: Authentication function using ONLY user_passwords table
  
  This completely replaces the broken authentication function that was incorrectly
  checking the accounts_lcmd.password field (which should NEVER be used).
  
  Correct logic:
  1. If account exists in user_passwords table - use that password
  2. If account does NOT exist in user_passwords table - allow ZIP code authentication
  3. NEVER check accounts_lcmd.password field
*/

-- Drop all broken authentication functions
DROP FUNCTION IF EXISTS authenticate_user_lcmd(text, text);
DROP FUNCTION IF EXISTS authenticate_user(text, text, text, text);

-- Create the CORRECT authentication function
CREATE OR REPLACE FUNCTION authenticate_user(
  p_identifier text, 
  p_password text, 
  p_ip_address text,
  p_2fa_code text
)
RETURNS TABLE(
  account_number bigint, 
  acct_name text, 
  address text, 
  city text, 
  state text, 
  zip text, 
  id bigint, 
  email_address text, 
  phone text,
  mobile_phone text, 
  requires_password_change boolean,
  is_special_admin boolean,
  needs_password_initialization boolean,
  requires_2fa boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_account_number bigint;
  v_acct_name text;
  v_zip text;
  v_default_password text;
  v_stored_password_hash text;
  v_has_custom_password boolean := false;
BEGIN
  -- Trim the identifier
  p_identifier := TRIM(p_identifier);
  
  -- Find account by identifier (account number or email)
  IF p_identifier ~ '^[0-9]+$' THEN
    -- Identifier is numeric, treat as account number
    SELECT a.account_number, a.acct_name, a.zip, a.address, a.city, a.state, 
           a.email_address, a.phone, a.mobile_phone
    INTO v_account_number, v_acct_name, v_zip
    FROM accounts_lcmd a
    WHERE a.account_number = p_identifier::bigint;
  ELSE
    -- Identifier is email address
    SELECT a.account_number, a.acct_name, a.zip, a.address, a.city, a.state,
           a.email_address, a.phone, a.mobile_phone
    INTO v_account_number, v_acct_name, v_zip
    FROM accounts_lcmd a
    WHERE LOWER(TRIM(a.email_address)) = LOWER(TRIM(p_identifier));
  END IF;

  -- If account not found, authentication fails
  IF v_account_number IS NULL THEN
    RETURN;
  END IF;

  -- Check if account has a custom password in user_passwords table
  SELECT password_hash INTO v_stored_password_hash
  FROM user_passwords 
  WHERE account_number = v_account_number;
  
  v_has_custom_password := (v_stored_password_hash IS NOT NULL);

  -- Calculate default password (ZIP code authentication)
  IF v_acct_name IS NOT NULL AND v_zip IS NOT NULL AND LENGTH(v_acct_name) > 0 AND LENGTH(v_zip) >= 5 THEN
    v_default_password := LOWER(SUBSTRING(v_acct_name FROM 1 FOR 1) || SUBSTRING(v_zip FROM 1 FOR 5));
  END IF;

  -- Authentication logic
  IF v_has_custom_password THEN
    -- Account has custom password - verify against stored hash
    IF NOT crypt(p_password, v_stored_password_hash) = v_stored_password_hash THEN
      -- Custom password doesn't match
      RETURN;
    END IF;
    
    -- Custom password matched - regular login
    RETURN QUERY
    SELECT
      a.account_number::bigint,
      COALESCE(a.acct_name, '')::text,
      COALESCE(a.address, '')::text,
      COALESCE(a.city, '')::text,
      COALESCE(a.state, '')::text,
      COALESCE(a.zip, '')::text,
      a.account_number::bigint as id,
      COALESCE(a.email_address, '')::text,
      COALESCE(a.phone, '')::text,
      COALESCE(a.mobile_phone, '')::text,
      false, -- requires_password_change
      (a.account_number = 99), -- is_special_admin
      false, -- needs_password_initialization
      false  -- requires_2fa
    FROM accounts_lcmd a
    WHERE a.account_number = v_account_number;
    
  ELSE
    -- Account does NOT have custom password - allow ZIP code authentication
    IF v_default_password IS NOT NULL AND LOWER(p_password) = v_default_password THEN
      -- ZIP code authentication successful - trigger password initialization
      RETURN QUERY
      SELECT
        a.account_number::bigint,
        COALESCE(a.acct_name, '')::text,
        COALESCE(a.address, '')::text,
        COALESCE(a.city, '')::text,
        COALESCE(a.state, '')::text,
        COALESCE(a.zip, '')::text,
        a.account_number::bigint as id,
        COALESCE(a.email_address, '')::text,
        COALESCE(a.phone, '')::text,
        COALESCE(a.mobile_phone, '')::text,
        false, -- requires_password_change
        (a.account_number = 99), -- is_special_admin
        true,  -- needs_password_initialization
        false  -- requires_2fa
      FROM accounts_lcmd a
      WHERE a.account_number = v_account_number;
    ELSE
      -- ZIP code doesn't match - authentication fails
      RETURN;
    END IF;
  END IF;
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION authenticate_user(text, text, text, text) TO anon, authenticated;