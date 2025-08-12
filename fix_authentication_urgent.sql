-- URGENT FIX: Update authentication function to use user_passwords table with hashed passwords
-- This fixes the login issue for account 48342 and all accounts using the new password system

-- Drop the old authentication function
DROP FUNCTION IF EXISTS authenticate_user_lcmd(text, text);

-- Create the corrected authentication function that uses user_passwords table
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
  requires_password_change boolean,
  debug_info text
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_account_number bigint;
  v_acct_name text;
  v_zip text;
  v_email text;
  v_mobile_phone text;
  v_address text;
  v_city text;
  v_state text;
  v_stored_password_hash text;
  v_default_password text;
  v_requires_password_change boolean;
  v_debug_info text := '';
BEGIN
  -- Trim the identifier to remove any potential whitespace
  p_identifier := TRIM(p_identifier);
  v_debug_info := v_debug_info || 'Using identifier: ' || p_identifier || '; ';
  
  -- Determine if identifier is an account number or email address
  IF p_identifier ~ '^[0-9]+$' THEN
    -- Identifier is numeric, treat as account number
    v_debug_info := v_debug_info || 'Treating as account number; ';
    
    SELECT a.account_number, a.acct_name, a.zip, a.email_address, a.mobile_phone, a.address, a.city, a.state
    INTO v_account_number, v_acct_name, v_zip, v_email, v_mobile_phone, v_address, v_city, v_state
    FROM accounts_lcmd a
    WHERE a.account_number = p_identifier::bigint;
    
  ELSE
    -- Identifier is not numeric, treat as email address
    v_debug_info := v_debug_info || 'Treating as email address; ';
    
    SELECT a.account_number, a.acct_name, a.zip, a.email_address, a.mobile_phone, a.address, a.city, a.state
    INTO v_account_number, v_acct_name, v_zip, v_email, v_mobile_phone, v_address, v_city, v_state
    FROM accounts_lcmd a
    WHERE LOWER(TRIM(a.email_address)) = LOWER(TRIM(p_identifier));
  END IF;

  -- If account not found, return debug info
  IF v_account_number IS NULL THEN
    v_debug_info := v_debug_info || 'Account not found; ';
    RETURN QUERY SELECT 
      NULL::bigint, NULL::text, NULL::text, NULL::text, NULL::text, NULL::text, 
      NULL::bigint, NULL::text, NULL::text, NULL::boolean, v_debug_info;
    RETURN;
  END IF;

  v_debug_info := v_debug_info || 'Account found: ' || v_account_number || '; ';

  -- Check if there's a hashed password in user_passwords table
  SELECT password_hash
  INTO v_stored_password_hash
  FROM user_passwords
  WHERE account_number = v_account_number;

  IF v_stored_password_hash IS NOT NULL THEN
    -- Use hashed password verification
    v_debug_info := v_debug_info || 'Found hashed password; ';
    
    -- Verify the provided password against the stored hash
    IF verify_password(p_password, v_stored_password_hash) THEN
      v_requires_password_change := FALSE;
      v_debug_info := v_debug_info || 'Hashed password verified; ';
    ELSE
      v_debug_info := v_debug_info || 'Hashed password verification failed; ';
      RETURN QUERY SELECT 
        NULL::bigint, NULL::text, NULL::text, NULL::text, NULL::text, NULL::text, 
        NULL::bigint, NULL::text, NULL::text, NULL::boolean, v_debug_info;
      RETURN;
    END IF;
  ELSE
    -- No hashed password found, check for default password (ZIP code fallback)
    v_debug_info := v_debug_info || 'No hashed password found, checking ZIP default; ';
    
    IF v_zip IS NOT NULL AND LENGTH(v_zip) >= 5 THEN
      v_default_password := SUBSTRING(v_zip FROM 1 FOR 5);
      v_debug_info := v_debug_info || 'Default ZIP password: ' || v_default_password || '; ';
      
      IF p_password = v_default_password THEN
        v_requires_password_change := TRUE;
        v_debug_info := v_debug_info || 'ZIP password matched; ';
      ELSE
        v_debug_info := v_debug_info || 'ZIP password mismatch; ';
        RETURN QUERY SELECT 
          NULL::bigint, NULL::text, NULL::text, NULL::text, NULL::text, NULL::text, 
          NULL::bigint, NULL::text, NULL::text, NULL::boolean, v_debug_info;
        RETURN;
      END IF;
    ELSE
      v_debug_info := v_debug_info || 'No valid ZIP code for default password; ';
      RETURN QUERY SELECT 
        NULL::bigint, NULL::text, NULL::text, NULL::text, NULL::text, NULL::text, 
        NULL::bigint, NULL::text, NULL::text, NULL::boolean, v_debug_info;
      RETURN;
    END IF;
  END IF;

  -- Authentication successful, return user data
  v_debug_info := v_debug_info || 'Authentication successful; ';
  
  RETURN QUERY SELECT
    v_account_number::bigint,
    COALESCE(v_acct_name, '')::text,
    COALESCE(v_address, '')::text,
    COALESCE(v_city, '')::text,
    COALESCE(v_state, '')::text,
    COALESCE(v_zip, '')::text,
    v_account_number::bigint as id,
    COALESCE(v_email, '')::text,       
    COALESCE(v_mobile_phone, '')::text,        
    v_requires_password_change,
    v_debug_info;
END;
$$;

-- Ensure execute permission is granted
GRANT EXECUTE ON FUNCTION authenticate_user_lcmd(text, text) TO anon, authenticated;

-- Ensure the function is owned by postgres (important for SECURITY DEFINER)
ALTER FUNCTION authenticate_user_lcmd(text, text) OWNER TO postgres;

-- Test the fix with account 48342
SELECT 
    'URGENT TEST' as test_name,
    account_number,
    acct_name,
    debug_info
FROM authenticate_user_lcmd('48342', 'Tueday321');

-- Additional diagnostics for account 48342
SELECT 
    'Account Info' as check_type,
    account_number,
    acct_name,
    zip,
    email_address
FROM accounts_lcmd 
WHERE account_number = 48342;

SELECT 
    'Password Hash Info' as check_type,
    account_number,
    LENGTH(password_hash) as hash_length,
    created_at
FROM user_passwords 
WHERE account_number = 48342;