-- Create a debug function to test 2FA authentication step by step
CREATE OR REPLACE FUNCTION debug_2fa_auth(
  p_identifier text,
  p_password text
)
RETURNS TABLE(
  step text,
  result text,
  details text
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
  v_requires_2fa boolean := false;
BEGIN
  -- Step 1: Check if account exists
  IF p_identifier ~ '^\d+$' THEN
    v_account_number := p_identifier::bigint;
    
    SELECT a.zip, a.acct_name, a.user_id
    INTO v_zip, v_acct_name, v_user_id
    FROM accounts_lcmd a
    WHERE a.account_number = v_account_number;
  END IF;

  -- Return step-by-step results
  RETURN QUERY SELECT 'account_lookup'::text, 
                      CASE WHEN v_account_number IS NOT NULL THEN 'FOUND' ELSE 'NOT_FOUND' END::text,
                      ('Account: ' || COALESCE(v_account_number::text, 'NULL') || ', Name: ' || COALESCE(v_acct_name, 'NULL'))::text;

  -- Step 2: Check admin password
  IF v_account_number = 999 THEN
    SELECT ac.config_value INTO v_stored_password_hash
    FROM admin_config ac
    WHERE ac.config_key = 'admin_999_password';
    
    RETURN QUERY SELECT 'admin_password_lookup'::text,
                        CASE WHEN v_stored_password_hash IS NOT NULL THEN 'FOUND' ELSE 'NOT_FOUND' END::text,
                        ('Stored: "' || COALESCE(v_stored_password_hash, 'NULL') || '", Input: "' || p_password || '", Match: ' || 
                         CASE WHEN v_stored_password_hash = p_password THEN 'YES' ELSE 'NO' END)::text;
  END IF;

  -- Step 3: Check 2FA requirement
  v_requires_2fa := (v_account_number = 999);
  RETURN QUERY SELECT '2fa_requirement'::text,
                      CASE WHEN v_requires_2fa THEN 'REQUIRED' ELSE 'NOT_REQUIRED' END::text,
                      ('Account 999: ' || v_requires_2fa::text)::text;

  -- Step 4: Test full authenticate_user call
  DECLARE
    v_auth_result record;
  BEGIN
    SELECT * INTO v_auth_result 
    FROM authenticate_user(p_identifier, p_password, '127.0.0.1', NULL) 
    LIMIT 1;
    
    RETURN QUERY SELECT 'full_auth_test'::text,
                        CASE WHEN v_auth_result IS NOT NULL THEN 'SUCCESS' ELSE 'FAILED' END::text,
                        ('Account: ' || COALESCE(v_auth_result.account_number::text, 'NULL') || 
                         ', 2FA: ' || COALESCE(v_auth_result.requires_2fa::text, 'NULL') ||
                         ', Debug: ' || COALESCE(v_auth_result.debug_info, 'NULL'))::text;
  END;
END;
$$;

GRANT EXECUTE ON FUNCTION debug_2fa_auth(text, text) TO anon, authenticated;