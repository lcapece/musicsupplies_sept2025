-- DEBUG VERSION - Find out why account 101 authentication fails

-- First, let's see what account 101 actually contains
SELECT 'Account 101 Data:' as debug_step;
SELECT account_number, acct_name, zip, 
       SUBSTRING(acct_name FROM 1 FOR 1) as first_letter,
       SUBSTRING(zip FROM 1 FOR 5) as first_5_zip,
       LOWER(SUBSTRING(acct_name FROM 1 FOR 1) || SUBSTRING(zip FROM 1 FOR 5)) as calculated_password
FROM accounts_lcmd 
WHERE account_number = 101;

-- Check if 101 is in user_passwords table
SELECT 'Account 101 in user_passwords:' as debug_step;
SELECT COUNT(*) as count_in_user_passwords FROM user_passwords WHERE account_number = 101;

-- Test the authenticate function with debug
DROP FUNCTION IF EXISTS authenticate_user_debug(text, text);

CREATE OR REPLACE FUNCTION authenticate_user_debug(
  p_identifier text, 
  p_password text
)
RETURNS TABLE(
  debug_info text,
  found_account boolean,
  account_name text,
  account_zip text,
  calculated_zip_password text,
  has_custom_password boolean,
  password_match boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_account_record RECORD;
  v_password_hash text;
  v_zip_password text;
  v_has_custom boolean := false;
  v_password_match boolean := false;
BEGIN
  -- Find account
  SELECT * INTO v_account_record 
  FROM accounts_lcmd 
  WHERE account_number = p_identifier::bigint;

  -- Check for custom password
  SELECT password_hash INTO v_password_hash
  FROM user_passwords 
  WHERE account_number = p_identifier::bigint;
  
  v_has_custom := (v_password_hash IS NOT NULL);
  
  -- Calculate ZIP password
  IF v_account_record.acct_name IS NOT NULL AND v_account_record.zip IS NOT NULL THEN
    v_zip_password := LOWER(SUBSTRING(v_account_record.acct_name FROM 1 FOR 1) || SUBSTRING(v_account_record.zip FROM 1 FOR 5));
    v_password_match := (LOWER(TRIM(p_password)) = v_zip_password);
  END IF;

  RETURN QUERY SELECT
    'Debug info'::text,
    (v_account_record.account_number IS NOT NULL)::boolean,
    COALESCE(v_account_record.acct_name, 'NULL')::text,
    COALESCE(v_account_record.zip, 'NULL')::text,
    COALESCE(v_zip_password, 'NULL')::text,
    v_has_custom::boolean,
    v_password_match::boolean;
END;
$$;

GRANT EXECUTE ON FUNCTION authenticate_user_debug(text, text) TO anon, authenticated;

-- Test the debug function
SELECT 'Testing debug function:' as debug_step;
SELECT * FROM authenticate_user_debug('101', '11803');