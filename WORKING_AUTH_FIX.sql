-- WORKING AUTH FIX - PROPERLY CREATED
-- No accounts table password checking - ONLY user_passwords table

DROP FUNCTION IF EXISTS authenticate_user(text, text, text, text);

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
  v_account_record RECORD;
  v_password_hash text;
  v_zip_password text;
BEGIN
  -- Find account
  IF p_identifier ~ '^[0-9]+$' THEN
    SELECT * INTO v_account_record FROM accounts_lcmd WHERE account_number = p_identifier::bigint;
  ELSE
    SELECT * INTO v_account_record FROM accounts_lcmd WHERE LOWER(email_address) = LOWER(p_identifier);
  END IF;

  -- Account not found
  IF v_account_record.account_number IS NULL THEN
    RETURN;
  END IF;

  -- Check if has custom password in user_passwords table ONLY
  SELECT password_hash INTO v_password_hash
  FROM user_passwords 
  WHERE account_number = v_account_record.account_number;

  IF v_password_hash IS NOT NULL THEN
    -- Has custom password - verify it
    IF crypt(p_password, v_password_hash) = v_password_hash THEN
      RETURN QUERY SELECT
        v_account_record.account_number::bigint,
        COALESCE(v_account_record.acct_name, '')::text,
        COALESCE(v_account_record.address, '')::text,
        COALESCE(v_account_record.city, '')::text,
        COALESCE(v_account_record.state, '')::text,
        COALESCE(v_account_record.zip, '')::text,
        v_account_record.account_number::bigint,
        COALESCE(v_account_record.email_address, '')::text,
        COALESCE(v_account_record.phone, '')::text,
        COALESCE(v_account_record.mobile_phone, '')::text,
        false, false, false, false;
    END IF;
  ELSE
    -- No custom password - check ZIP code
    v_zip_password := LOWER(SUBSTRING(v_account_record.acct_name FROM 1 FOR 1) || SUBSTRING(v_account_record.zip FROM 1 FOR 5));
    IF LOWER(p_password) = v_zip_password THEN
      RETURN QUERY SELECT
        v_account_record.account_number::bigint,
        COALESCE(v_account_record.acct_name, '')::text,
        COALESCE(v_account_record.address, '')::text,
        COALESCE(v_account_record.city, '')::text,
        COALESCE(v_account_record.state, '')::text,
        COALESCE(v_account_record.zip, '')::text,
        v_account_record.account_number::bigint,
        COALESCE(v_account_record.email_address, '')::text,
        COALESCE(v_account_record.phone, '')::text,
        COALESCE(v_account_record.mobile_phone, '')::text,
        false, false, true, false; -- needs_password_initialization = true
    END IF;
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION authenticate_user(text, text, text, text) TO anon, authenticated;