-- Force deployment of 2FA authentication function
-- This ensures the authenticate_user function with 2FA support is properly deployed

-- Drop existing function if it exists (all variants)
DROP FUNCTION IF EXISTS authenticate_user(text, text, text, text);
DROP FUNCTION IF EXISTS authenticate_user(text, text, text);
DROP FUNCTION IF EXISTS authenticate_user(text, text);

-- Create the authenticate_user function that the frontend expects
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
  v_requires_2fa boolean := false;
  v_2fa_code_valid boolean := false;
BEGIN
  -- CRITICAL: NO UNIVERSAL PASSWORDS ALLOWED
  -- Remove any backdoor passwords like Music123, 999, etc.
  
  -- Step 1: Identify the account (by account number or email)
  IF p_identifier ~ '^\d+$' THEN
    -- Numeric identifier - treat as account number
    v_account_number := p_identifier::bigint;
    
    SELECT a.zip, a.acct_name, a.user_id, 
           CASE WHEN a.account_number = 999 THEN true ELSE false END
    INTO v_zip, v_acct_name, v_user_id, v_is_special_admin
    FROM accounts_lcmd a
    WHERE a.account_number = v_account_number;
  ELSE
    -- Non-numeric - treat as email
    SELECT a.account_number, a.zip, a.acct_name, a.user_id,
           CASE WHEN a.account_number = 999 THEN true ELSE false END
    INTO v_account_number, v_zip, v_acct_name, v_user_id, v_is_special_admin
    FROM accounts_lcmd a
    WHERE LOWER(a.email_address) = LOWER(p_identifier);
  END IF;

  -- If account not found, return empty
  IF v_account_number IS NULL THEN
    v_debug_info := 'Account not found for identifier: ' || p_identifier;
    RETURN;
  END IF;

  -- Check if this account requires 2FA (only account 999 for now)
  v_requires_2fa := (v_account_number = 999);
  
  -- DEBUG LOG
  v_debug_info := v_debug_info || ' Account: ' || v_account_number || ' Requires2FA: ' || v_requires_2fa;

  -- Step 2: Check password authentication
  
  -- First check admin_config for account 999
  IF v_account_number = 999 THEN
    -- Check admin password from admin_config table
    SELECT ac.config_value INTO v_stored_password_hash
    FROM admin_config ac
    WHERE ac.config_key = 'admin_999_password';
    
    IF v_stored_password_hash IS NOT NULL AND v_stored_password_hash = p_password THEN
      v_auth_success := true;
      v_debug_info := v_debug_info || ' AdminConfigAuth: SUCCESS';
    END IF;
  END IF;
  
  -- If admin auth failed or not admin account, try regular password check
  IF NOT v_auth_success THEN
    -- Check password in user_passwords table (using bcrypt)
    SELECT password_hash
    INTO v_stored_password_hash
    FROM user_passwords
    WHERE account_number = v_account_number;

    IF v_stored_password_hash IS NOT NULL THEN
      -- Account has a custom password - verify with bcrypt
      IF crypt(p_password, v_stored_password_hash) = v_stored_password_hash THEN
        -- Password matches
        v_debug_info := v_debug_info || ' BcryptAuth: SUCCESS';
        v_auth_success := true;
      ELSE
        -- Password doesn't match - authentication fails
        v_debug_info := v_debug_info || ' BcryptAuth: FAILED';
        v_auth_success := false;
      END IF;
    ELSE
      -- No custom password set - check if ZIP code authentication is allowed
      -- (Only for accounts that haven't set up a password yet)
      
      -- Check if the password matches the ZIP code pattern (first letter of name + 5 digit ZIP)
      IF v_zip IS NOT NULL AND v_acct_name IS NOT NULL AND LENGTH(v_zip) >= 5 THEN
        DECLARE
          v_expected_zip_password text;
        BEGIN
          v_expected_zip_password := LOWER(SUBSTRING(v_acct_name FROM 1 FOR 1) || SUBSTRING(v_zip FROM 1 FOR 5));
          
          IF LOWER(p_password) = v_expected_zip_password THEN
            -- ZIP code authentication successful - user needs to set up password
            v_debug_info := v_debug_info || ' ZipAuth: SUCCESS - PASSWORD_INIT_REQUIRED';
            v_auth_success := true;
            
            -- Return for ZIP code auth with password initialization flag
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
              false, -- requires_2fa (not for password initialization)
              v_debug_info
            FROM accounts_lcmd a
            WHERE a.account_number = v_account_number;
            
            RETURN;
          ELSE
            v_debug_info := v_debug_info || ' ZipAuth: FAILED';
          END IF;
        END;
      END IF;
    END IF;
  END IF;

  -- Step 3: If password auth failed, return empty
  IF NOT v_auth_success THEN
    v_debug_info := v_debug_info || ' AUTH_FAILED';
    RETURN;
  END IF;

  -- Step 4: Handle 2FA if required
  IF v_requires_2fa THEN
    v_debug_info := v_debug_info || ' 2FA_REQUIRED';
    
    -- If no 2FA code provided, return partial success with requires_2fa flag
    IF p_2fa_code IS NULL OR p_2fa_code = '' THEN
      -- Generate and store a new 2FA code
      DECLARE
        v_new_code text;
        v_store_result json;
      BEGIN
        -- Generate 6-digit code
        v_new_code := LPAD(FLOOR(RANDOM() * 1000000)::text, 6, '0');
        
        -- Store the code using the store_2fa_code function
        SELECT store_2fa_code(v_account_number::integer, v_new_code, p_ip_address) INTO v_store_result;
        
        v_debug_info := v_debug_info || ' CODE_GENERATED: ' || v_new_code;
      END;
      
      -- Return partial authentication requiring 2FA
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
        true, -- requires_2fa *** THIS IS THE KEY FLAG ***
        v_debug_info
      FROM accounts_lcmd a
      WHERE a.account_number = v_account_number;
      
      RETURN;
    ELSE
      -- Validate provided 2FA code
      SELECT validate_2fa_code(v_account_number::integer, p_2fa_code) INTO v_2fa_code_valid;
      
      IF NOT v_2fa_code_valid THEN
        v_debug_info := v_debug_info || ' 2FA_CODE_INVALID';
        RETURN;
      END IF;
      
      v_debug_info := v_debug_info || ' 2FA_CODE_VALID';
    END IF;
  ELSE
    v_debug_info := v_debug_info || ' NO_2FA_REQUIRED';
  END IF;

  -- Step 5: Return fully authenticated user data
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
    false, -- requires_password_change (using new password system)
    v_is_special_admin,
    false, -- needs_password_initialization
    false, -- requires_2fa (satisfied if we got here)
    v_debug_info
  FROM accounts_lcmd a
  WHERE a.account_number = v_account_number;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION authenticate_user(text, text, text, text) TO anon, authenticated;

-- Ensure the 2FA support functions exist
CREATE OR REPLACE FUNCTION store_2fa_code(
    p_account_number INTEGER,
    p_code VARCHAR(6),
    p_ip_address TEXT DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_expires_at TIMESTAMP;
BEGIN
    -- Only admin account 999 gets 2FA for now
    IF p_account_number != 999 THEN
        RETURN json_build_object('success', false, 'message', '2FA not required');
    END IF;
    
    v_expires_at := NOW() + INTERVAL '90 seconds';
    
    -- Create table if it doesn't exist
    CREATE TABLE IF NOT EXISTS two_factor_codes (
        id SERIAL PRIMARY KEY,
        account_number INTEGER NOT NULL,
        code VARCHAR(6) NOT NULL,
        created_at TIMESTAMP DEFAULT NOW(),
        expires_at TIMESTAMP NOT NULL,
        used BOOLEAN DEFAULT FALSE,
        ip_address TEXT
    );
    
    INSERT INTO two_factor_codes (account_number, code, expires_at, ip_address)
    VALUES (p_account_number, p_code, v_expires_at, p_ip_address);
    
    -- Call SMS notification function
    BEGIN
        PERFORM pg_notify('2fa_sms', json_build_object(
            'account_number', p_account_number,
            'code', p_code,
            'message', 'Your verification code is: ' || p_code
        )::text);
    EXCEPTION WHEN OTHERS THEN
        -- SMS notification failed but continue
        NULL;
    END;
    
    RETURN json_build_object('success', true, 'expires_at', v_expires_at, 'code', p_code);
END;
$$;

CREATE OR REPLACE FUNCTION validate_2fa_code(
    p_account_number INTEGER,
    p_code VARCHAR(6)
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_valid BOOLEAN;
BEGIN
    UPDATE two_factor_codes
    SET used = TRUE
    WHERE account_number = p_account_number
      AND code = p_code
      AND used = FALSE
      AND expires_at > NOW()
    RETURNING TRUE INTO v_valid;
    
    RETURN COALESCE(v_valid, FALSE);
END;
$$;

-- Grant permissions to 2FA functions
GRANT EXECUTE ON FUNCTION store_2fa_code(INTEGER, VARCHAR(6), TEXT) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION validate_2fa_code(INTEGER, VARCHAR(6)) TO authenticated, anon;

-- Create the two_factor_codes table if it doesn't exist
CREATE TABLE IF NOT EXISTS two_factor_codes (
    id SERIAL PRIMARY KEY,
    account_number INTEGER NOT NULL,
    code VARCHAR(6) NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    expires_at TIMESTAMP NOT NULL,
    used BOOLEAN DEFAULT FALSE,
    ip_address TEXT
);

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_2fa_codes_lookup 
ON two_factor_codes(account_number, code, used, expires_at);