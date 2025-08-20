-- Fix function overloading issue by dropping all authenticate_user functions and creating one clean version

-- Drop ALL existing authenticate_user functions with any parameter combinations
DROP FUNCTION IF EXISTS authenticate_user(text, text, text, text);
DROP FUNCTION IF EXISTS authenticate_user(text, text, text);
DROP FUNCTION IF EXISTS authenticate_user(text, text);
DROP FUNCTION IF EXISTS authenticate_user(text);

-- Create ONE clean authenticate_user function that works
CREATE OR REPLACE FUNCTION authenticate_user(
  p_identifier text,
  p_password text,
  p_ip_address text DEFAULT NULL,
  p_2fa_code text DEFAULT NULL
)
RETURNS TABLE(
  account_number bigint,
  acct_name text,
  address text,
  city text,
  state text,
  zip text,
  id uuid,
  email_address text,
  phone text,
  mobile_phone text,
  requires_password_change boolean,
  is_special_admin boolean,
  needs_password_initialization boolean,
  requires_2fa boolean,
  debug_info text
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_account_number bigint;
  v_stored_password_hash text;
  v_zip text;
  v_acct_name text;
  v_user_id uuid;
  v_is_special_admin boolean;
  v_debug_info text := '';
  v_auth_success boolean := false;
BEGIN
  -- Step 1: Identify the account
  IF p_identifier ~ '^\d+$' THEN
    v_account_number := p_identifier::bigint;
    
    SELECT a.zip, a.acct_name, a.user_id, 
           CASE WHEN a.account_number = 999 THEN true ELSE false END
    INTO v_zip, v_acct_name, v_user_id, v_is_special_admin
    FROM accounts_lcmd a
    WHERE a.account_number = v_account_number;
  ELSE
    SELECT a.account_number, a.zip, a.acct_name, a.user_id,
           CASE WHEN a.account_number = 999 THEN true ELSE false END
    INTO v_account_number, v_zip, v_acct_name, v_user_id, v_is_special_admin
    FROM accounts_lcmd a
    WHERE LOWER(a.email_address) = LOWER(p_identifier);
  END IF;

  IF v_account_number IS NULL THEN
    v_debug_info := 'Account not found: ' || p_identifier;
    RETURN;
  END IF;

  -- Step 2: Check password authentication
  IF v_account_number = 999 THEN
    -- Admin account 999 - check admin_config
    SELECT ac.config_value INTO v_stored_password_hash
    FROM admin_config ac
    WHERE ac.config_key = 'admin_999_password';
    
    IF v_stored_password_hash IS NOT NULL AND v_stored_password_hash = p_password THEN
      v_auth_success := true;
      v_debug_info := 'Admin 999 authentication successful';
    END IF;
  END IF;
  
  -- If admin auth failed or not admin, try user_passwords table
  IF NOT v_auth_success THEN
    SELECT password_hash INTO v_stored_password_hash
    FROM user_passwords WHERE account_number = v_account_number;

    IF v_stored_password_hash IS NOT NULL THEN
      IF crypt(p_password, v_stored_password_hash) = v_stored_password_hash THEN
        v_auth_success := true;
        v_debug_info := 'User password authentication successful';
      END IF;
    ELSE
      -- ZIP code fallback
      IF v_zip IS NOT NULL AND v_acct_name IS NOT NULL AND LENGTH(v_zip) >= 5 THEN
        DECLARE
          v_expected_zip_password text;
        BEGIN
          v_expected_zip_password := LOWER(SUBSTRING(v_acct_name FROM 1 FOR 1) || SUBSTRING(v_zip FROM 1 FOR 5));
          
          IF LOWER(p_password) = v_expected_zip_password THEN
            v_auth_success := true;
            v_debug_info := 'ZIP code authentication - needs password setup';
            
            RETURN QUERY
            SELECT
              a.account_number::bigint,
              COALESCE(a.acct_name, '')::text,
              COALESCE(a.address, '')::text,
              COALESCE(a.city, '')::text,
              COALESCE(a.state, '')::text,
              COALESCE(a.zip, '')::text,
              a.user_id,
              COALESCE(a.email_address, '')::text,
              COALESCE(a.phone, '')::text,
              COALESCE(a.mobile_phone, '')::text,
              false, -- requires_password_change
              v_is_special_admin,
              true, -- needs_password_initialization
              false, -- requires_2fa (DISABLED)
              v_debug_info
            FROM accounts_lcmd a WHERE a.account_number = v_account_number;
            RETURN;
          END IF;
        END;
      END IF;
    END IF;
  END IF;

  IF NOT v_auth_success THEN
    v_debug_info := 'Authentication failed';
    RETURN;
  END IF;

  -- Return successful login
  RETURN QUERY
  SELECT
    a.account_number::bigint,
    COALESCE(a.acct_name, '')::text,
    COALESCE(a.address, '')::text,
    COALESCE(a.city, '')::text,
    COALESCE(a.state, '')::text,
    COALESCE(a.zip, '')::text,
    a.user_id,
    COALESCE(a.email_address, '')::text,
    COALESCE(a.phone, '')::text,
    COALESCE(a.mobile_phone, '')::text,
    false, -- requires_password_change
    v_is_special_admin,
    false, -- needs_password_initialization
    false, -- requires_2fa (DISABLED)
    v_debug_info
  FROM accounts_lcmd a WHERE a.account_number = v_account_number;
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION authenticate_user(text, text, text, text) TO anon, authenticated;

-- Test it
SELECT 'Testing function...' as status;
SELECT * FROM authenticate_user('999', 'admin999', '127.0.0.1', null);