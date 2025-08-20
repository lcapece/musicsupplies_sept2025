-- SIMPLE FIX - Make account 101 work with 11803 using REAL database data

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
BEGIN
  -- Find account in database
  IF p_identifier ~ '^[0-9]+$' THEN
    SELECT * INTO v_account_record 
    FROM accounts_lcmd 
    WHERE account_number = p_identifier::bigint;
  ELSE
    SELECT * INTO v_account_record 
    FROM accounts_lcmd 
    WHERE LOWER(TRIM(email_address)) = LOWER(TRIM(p_identifier));
  END IF;

  -- If no account found, return empty
  IF v_account_record.account_number IS NULL THEN
    RETURN;
  END IF;

  -- Check if has custom password
  SELECT password_hash INTO v_password_hash
  FROM user_passwords 
  WHERE account_number = v_account_record.account_number;

  -- If has custom password, verify it
  IF v_password_hash IS NOT NULL THEN
    IF crypt(p_password, v_password_hash) = v_password_hash THEN
      -- Custom password matched - return account
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
        false::boolean,
        (v_account_record.account_number = 99)::boolean,
        false::boolean,
        false::boolean
      ;
    END IF;
  ELSE
    -- No custom password - try ZIP authentication
    -- Simple check: if password is exactly the ZIP code
    IF TRIM(p_password) = TRIM(v_account_record.zip) THEN
      -- ZIP matches - return account with password initialization needed
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
        false::boolean,
        (v_account_record.account_number = 99)::boolean,
        true::boolean,  -- needs_password_initialization
        false::boolean
      ;
    END IF;
  END IF;

  -- If we get here, authentication failed
  RETURN;
END;
$$;

GRANT EXECUTE ON FUNCTION authenticate_user(text, text, text, text) TO anon, authenticated;