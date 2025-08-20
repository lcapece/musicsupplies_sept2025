-- NUCLEAR FIX: Drop ALL authenticate functions and recreate
DO $$
DECLARE
    r RECORD;
BEGIN
    -- Drop all functions that start with authenticate
    FOR r IN SELECT 'DROP FUNCTION IF EXISTS ' || ns.nspname || '.' || p.proname || '(' || pg_get_function_identity_arguments(p.oid) || ') CASCADE;' AS drop_statement
             FROM pg_proc p
             JOIN pg_namespace ns ON p.pronamespace = ns.oid
             WHERE p.proname LIKE '%authenticate%' AND ns.nspname = 'public'
    LOOP
        EXECUTE r.drop_statement;
        RAISE NOTICE 'Executed: %', r.drop_statement;
    END LOOP;
END $$;

-- Now create ONLY ONE authenticate_user function
CREATE FUNCTION authenticate_user(
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
  v_debug_info text := 'Starting authentication';
  v_auth_success boolean := false;
BEGIN
  -- Identify account
  IF p_identifier ~ '^\d+$' THEN
    v_account_number := p_identifier::bigint;
    v_debug_info := v_debug_info || ' - Account number: ' || v_account_number;
    
    SELECT a.zip, a.acct_name, a.user_id, 
           CASE WHEN a.account_number = 999 THEN true ELSE false END
    INTO v_zip, v_acct_name, v_user_id, v_is_special_admin
    FROM accounts_lcmd a
    WHERE a.account_number = v_account_number;
  ELSE
    v_debug_info := v_debug_info || ' - Email: ' || p_identifier;
    
    SELECT a.account_number, a.zip, a.acct_name, a.user_id,
           CASE WHEN a.account_number = 999 THEN true ELSE false END
    INTO v_account_number, v_zip, v_acct_name, v_user_id, v_is_special_admin
    FROM accounts_lcmd a
    WHERE LOWER(a.email_address) = LOWER(p_identifier);
  END IF;

  IF v_account_number IS NULL THEN
    v_debug_info := v_debug_info || ' - Account not found';
    RETURN;
  END IF;

  v_debug_info := v_debug_info || ' - Found account: ' || v_account_number;

  -- Check password for admin account 999
  IF v_account_number = 999 THEN
    v_debug_info := v_debug_info || ' - Checking admin password';
    
    SELECT ac.config_value INTO v_stored_password_hash
    FROM admin_config ac
    WHERE ac.config_key = 'admin_999_password';
    
    v_debug_info := v_debug_info || ' - Admin password in DB: ' || COALESCE(v_stored_password_hash, 'NULL');
    
    IF v_stored_password_hash IS NOT NULL AND v_stored_password_hash = p_password THEN
      v_auth_success := true;
      v_debug_info := v_debug_info || ' - Admin auth SUCCESS';
    ELSE
      v_debug_info := v_debug_info || ' - Admin auth FAILED';
    END IF;
  END IF;

  IF NOT v_auth_success THEN
    v_debug_info := v_debug_info || ' - Auth failed, returning empty';
    RETURN;
  END IF;

  v_debug_info := v_debug_info || ' - Returning user data';

  -- Return successful authentication
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
    false,
    v_is_special_admin,
    false,
    false,
    v_debug_info
  FROM accounts_lcmd a WHERE a.account_number = v_account_number;
END;
$$;

GRANT EXECUTE ON FUNCTION authenticate_user(text, text, text, text) TO anon, authenticated;

-- Test the function
SELECT 'TESTING FUNCTION' as test_status;
SELECT * FROM authenticate_user('999', 'admin999', '127.0.0.1', null);