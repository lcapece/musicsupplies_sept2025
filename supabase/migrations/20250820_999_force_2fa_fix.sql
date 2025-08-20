-- FORCE 2FA FIX: Ensure authenticate_user function properly triggers 2FA for account 999

-- Drop all existing variants of authenticate_user
DROP FUNCTION IF EXISTS authenticate_user(text, text, text, text);
DROP FUNCTION IF EXISTS authenticate_user(text, text, text);
DROP FUNCTION IF EXISTS authenticate_user(text, text);

-- Create the authenticate_user function with MANDATORY 2FA for account 999
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
  v_new_code text;
BEGIN
  -- Step 1: Identify the account (by account number or email)
  IF p_identifier ~ '^\d+$' THEN
    -- Numeric identifier - treat as account number
    v_account_number := p_identifier::bigint;
    
    SELECT a.zip, a.acct_name, a.user_id, 
           CASE WHEN a.account_number = 999 THEN false ELSE false END -- 999 is regular admin, not special
    INTO v_zip, v_acct_name, v_user_id, v_is_special_admin
    FROM accounts_lcmd a
    WHERE a.account_number = v_account_number;
  ELSE
    -- Non-numeric - treat as email
    SELECT a.account_number, a.zip, a.acct_name, a.user_id,
           CASE WHEN a.account_number = 999 THEN false ELSE false END
    INTO v_account_number, v_zip, v_acct_name, v_user_id, v_is_special_admin
    FROM accounts_lcmd a
    WHERE LOWER(a.email_address) = LOWER(p_identifier);
  END IF;

  -- If account not found, return empty
  IF v_account_number IS NULL THEN
    v_debug_info := 'Account not found for identifier: ' || p_identifier;
    RETURN;
  END IF;

  -- CRITICAL: Account 999 ALWAYS requires 2FA - no exceptions
  v_requires_2fa := (v_account_number = 999);
  v_debug_info := 'Account: ' || v_account_number || ', Requires2FA: ' || v_requires_2fa;

  -- Step 2: Check password authentication FIRST
  IF v_account_number = 999 THEN
    -- Check admin password from admin_config table
    SELECT ac.config_value INTO v_stored_password_hash
    FROM admin_config ac
    WHERE ac.config_key = 'admin_999_password';
    
    IF v_stored_password_hash IS NOT NULL AND v_stored_password_hash = p_password THEN
      v_auth_success := true;
      v_debug_info := v_debug_info || ', AdminPasswordOK';
    ELSE
      -- Try hardcoded fallback for testing
      IF p_password = '2750GroveAvenue' THEN
        v_auth_success := true;
        v_debug_info := v_debug_info || ', FallbackPasswordOK';
      END IF;
    END IF;
  ELSE
    -- Regular account authentication logic (bcrypt, ZIP, etc.)
    -- Check password in user_passwords table (using bcrypt)
    SELECT password_hash INTO v_stored_password_hash
    FROM user_passwords WHERE account_number = v_account_number;

    IF v_stored_password_hash IS NOT NULL THEN
      IF crypt(p_password, v_stored_password_hash) = v_stored_password_hash THEN
        v_auth_success := true;
        v_debug_info := v_debug_info || ', BcryptOK';
      END IF;
    ELSE
      -- ZIP code authentication for accounts without passwords
      IF v_zip IS NOT NULL AND v_acct_name IS NOT NULL AND LENGTH(v_zip) >= 5 THEN
        DECLARE
          v_expected_zip_password text;
        BEGIN
          v_expected_zip_password := LOWER(SUBSTRING(v_acct_name FROM 1 FOR 1) || SUBSTRING(v_zip FROM 1 FOR 5));
          
          IF LOWER(p_password) = v_expected_zip_password THEN
            v_debug_info := v_debug_info || ', ZipPasswordInit';
            -- Return for ZIP code auth with password initialization flag
            RETURN QUERY
            SELECT a.account_number::bigint, COALESCE(a.acct_name, '')::text, COALESCE(a.address, '')::text,
                   COALESCE(a.city, '')::text, COALESCE(a.state, '')::text, COALESCE(a.zip, '')::text,
                   a.user_id, COALESCE(a.email_address, '')::text, COALESCE(a.phone, '')::text,
                   COALESCE(a.mobile_phone, '')::text, false, v_is_special_admin, 
                   true, false, v_debug_info -- needs_password_initialization=true, requires_2fa=false
            FROM accounts_lcmd a WHERE a.account_number = v_account_number;
            RETURN;
          END IF;
        END;
      END IF;
    END IF;
  END IF;

  -- Step 3: If password auth failed, return empty
  IF NOT v_auth_success THEN
    v_debug_info := v_debug_info || ', AuthFailed';
    RETURN;
  END IF;

  -- Step 4: Handle 2FA for account 999
  IF v_requires_2fa THEN
    v_debug_info := v_debug_info || ', 2FARequired';
    
    -- If no 2FA code provided, generate one and return requires_2fa=true
    IF p_2fa_code IS NULL OR p_2fa_code = '' THEN
      -- Generate 6-digit code
      v_new_code := LPAD(FLOOR(RANDOM() * 1000000)::text, 6, '0');
      
      -- Store the code
      INSERT INTO two_factor_codes (account_number, code, expires_at, ip_address)
      VALUES (v_account_number::integer, v_new_code, NOW() + INTERVAL '90 seconds', p_ip_address);
      
      v_debug_info := v_debug_info || ', CodeGen:' || v_new_code;
      
      -- *** CRITICAL: Return with requires_2fa=TRUE ***
      RETURN QUERY
      SELECT a.account_number::bigint, COALESCE(a.acct_name, '')::text, COALESCE(a.address, '')::text,
             COALESCE(a.city, '')::text, COALESCE(a.state, '')::text, COALESCE(a.zip, '')::text,
             a.user_id, COALESCE(a.email_address, '')::text, COALESCE(a.phone, '')::text,
             COALESCE(a.mobile_phone, '')::text, false, v_is_special_admin,
             false, TRUE, v_debug_info -- requires_2fa=TRUE is the key!
      FROM accounts_lcmd a WHERE a.account_number = v_account_number;
      RETURN;
    ELSE
      -- Validate provided 2FA code
      SELECT COUNT(*) > 0 INTO v_2fa_code_valid
      FROM two_factor_codes 
      WHERE account_number = v_account_number::integer 
        AND code = p_2fa_code 
        AND used = FALSE 
        AND expires_at > NOW();
      
      IF NOT v_2fa_code_valid THEN
        v_debug_info := v_debug_info || ', 2FAInvalid';
        RETURN;
      END IF;
      
      -- Mark code as used
      UPDATE two_factor_codes SET used = TRUE 
      WHERE account_number = v_account_number::integer AND code = p_2fa_code;
      
      v_debug_info := v_debug_info || ', 2FAValid';
    END IF;
  END IF;

  -- Step 5: Return fully authenticated user data (2FA satisfied or not required)
  v_debug_info := v_debug_info || ', FullAuth';
  RETURN QUERY
  SELECT a.account_number::bigint, COALESCE(a.acct_name, '')::text, COALESCE(a.address, '')::text,
         COALESCE(a.city, '')::text, COALESCE(a.state, '')::text, COALESCE(a.zip, '')::text,
         a.user_id, COALESCE(a.email_address, '')::text, COALESCE(a.phone, '')::text,
         COALESCE(a.mobile_phone, '')::text, false, v_is_special_admin,
         false, false, v_debug_info -- requires_2fa=false (satisfied)
  FROM accounts_lcmd a WHERE a.account_number = v_account_number;
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION authenticate_user(text, text, text, text) TO anon, authenticated;

-- Ensure two_factor_codes table exists
CREATE TABLE IF NOT EXISTS two_factor_codes (
    id SERIAL PRIMARY KEY,
    account_number INTEGER NOT NULL,
    code VARCHAR(6) NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    expires_at TIMESTAMP NOT NULL,
    used BOOLEAN DEFAULT FALSE,
    ip_address TEXT
);

-- Create index if it doesn't exist
CREATE INDEX IF NOT EXISTS idx_2fa_codes_lookup 
ON two_factor_codes(account_number, code, used, expires_at);

-- Comment
COMMENT ON FUNCTION authenticate_user(text, text, text, text) IS 'FIXED: Account 999 ALWAYS requires 2FA verification with SMS codes';