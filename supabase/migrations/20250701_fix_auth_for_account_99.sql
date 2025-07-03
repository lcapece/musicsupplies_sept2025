/*
  # Fix authentication function for account 99
  
  This migration fixes an issue with the authentication function for account 99,
  ensuring that the password is properly recognized for the special admin account.
*/

-- Drop the existing function
DROP FUNCTION IF EXISTS authenticate_user_lcmd(text, text);

-- Create the updated function with improved account 99 handling
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
  is_special_admin boolean,
  debug_info text
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_account_number bigint;
  v_stored_password text;
  v_acct_name text;
  v_zip text;
  v_default_password text;
  v_requires_password_change boolean;
  v_is_special_admin boolean := FALSE;
  v_debug_info text := '';
  v_logon_password text;
BEGIN
  -- Trim the identifier to remove any potential whitespace
  p_identifier := TRIM(p_identifier);
  v_debug_info := v_debug_info || 'Using identifier: ' || p_identifier || '; ';
  
  -- Determine if identifier is an account number or email address
  IF p_identifier ~ '^[0-9]+$' THEN
    -- Identifier is numeric, treat as account number
    v_debug_info := v_debug_info || 'Treating as account number; ';
    
    SELECT a.account_number, a.password, a.acct_name, a.zip
    INTO v_account_number, v_stored_password, v_acct_name, v_zip
    FROM accounts_lcmd a
    WHERE a.account_number = p_identifier::bigint;
    
    IF v_account_number IS NULL THEN
      v_debug_info := v_debug_info || 'Account number not found; ';
    ELSE
      v_debug_info := v_debug_info || 'Account number found; ';
    END IF;
  ELSE
    -- Identifier is not numeric, treat as email address
    v_debug_info := v_debug_info || 'Treating as email address; ';
    
    SELECT a.account_number, a.password, a.acct_name, a.zip
    INTO v_account_number, v_stored_password, v_acct_name, v_zip
    FROM accounts_lcmd a
    WHERE LOWER(TRIM(a.email_address)) = LOWER(TRIM(p_identifier));
    
    IF v_account_number IS NULL THEN
      v_debug_info := v_debug_info || 'Email address not found; ';
    ELSE
      v_debug_info := v_debug_info || 'Email address found; ';
    END IF;
  END IF;

  -- If account not found, return debug info
  IF v_account_number IS NULL THEN
    RETURN QUERY SELECT 
      NULL::bigint, 
      NULL::text, 
      NULL::text, 
      NULL::text, 
      NULL::text, 
      NULL::text, 
      NULL::bigint, 
      NULL::text, 
      NULL::text, 
      NULL::boolean,
      FALSE::boolean,
      v_debug_info;
    RETURN;
  END IF;

  -- Check if this is account 99 (special admin account for SKU imports)
  IF v_account_number = 99 THEN
    v_is_special_admin := TRUE;
    v_debug_info := v_debug_info || 'Special admin account detected (99); ';
    
    -- For account 99, check password directly from logon_lcmd table first
    SELECT l.password 
    INTO v_logon_password
    FROM logon_lcmd l
    WHERE l.account_number = 99;
    
    v_debug_info := v_debug_info || 'Checking special admin password; ';
    
    -- Direct password check for account 99
    IF v_logon_password IS NOT NULL AND (v_logon_password = p_password OR LOWER(TRIM(v_logon_password)) = LOWER(TRIM(p_password))) THEN
      v_debug_info := v_debug_info || 'Special admin password matched; ';
      v_requires_password_change := FALSE;
      
      -- Return the authenticated user data with debug info for account 99
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
        COALESCE(a.mobile_phone, '')::text,        
        v_requires_password_change,
        v_is_special_admin,
        v_debug_info
      FROM accounts_lcmd a
      WHERE a.account_number = v_account_number;
      
      RETURN;
    ELSE
      v_debug_info := v_debug_info || 'Special admin password did not match; ';
    END IF;
  END IF;

  -- Calculate default password (first letter of account name + first 5 digits of zip code)
  IF v_acct_name IS NOT NULL AND v_zip IS NOT NULL THEN
    -- Ensure we have a valid starting character and enough digits in zip
    IF LENGTH(v_acct_name) > 0 AND LENGTH(v_zip) >= 5 THEN
      v_default_password := LOWER(SUBSTRING(v_acct_name FROM 1 FOR 1) || SUBSTRING(v_zip FROM 1 FOR 5));
      v_debug_info := v_debug_info || 'Default password calculated; ';
    ELSE
      v_default_password := NULL;
      v_debug_info := v_debug_info || 'Could not calculate default password (invalid name or zip); ';
    END IF;
  ELSE
    v_default_password := NULL;
    v_debug_info := v_debug_info || 'Could not calculate default password (missing name or zip); ';
  END IF;

  -- For debugging password comparison
  v_debug_info := v_debug_info || 'Comparing passwords; ';
  
  -- Check for password in logon_lcmd table
  SELECT l.password 
  INTO v_logon_password
  FROM logon_lcmd l
  WHERE l.account_number = v_account_number;
  
  -- If found in logon_lcmd, use that password for comparison
  IF v_logon_password IS NOT NULL THEN
    v_debug_info := v_debug_info || 'Found password in logon_lcmd; ';
    v_stored_password := v_logon_password;
  END IF;
  
  -- Password debug info
  v_debug_info := v_debug_info || 'Comparing passwords (provided length: ' || COALESCE(LENGTH(p_password)::text, '0') || ', stored length: ' || COALESCE(LENGTH(v_stored_password)::text, '0') || '); ';
  
  -- Trim and normalize passwords for comparison
  p_password := TRIM(p_password);
  
  -- Check if provided password matches default password (case-insensitive)
  IF v_default_password IS NOT NULL AND LOWER(p_password) = v_default_password THEN
    v_requires_password_change := TRUE;
    v_debug_info := v_debug_info || 'Default password matched; ';
  -- Check if stored password exists and matches (with flexible comparison)
  ELSIF v_stored_password IS NOT NULL THEN
    -- Try multiple comparison methods (this handles various edge cases)
    IF LOWER(TRIM(v_stored_password)) = LOWER(TRIM(p_password)) THEN
      v_requires_password_change := FALSE;
      v_debug_info := v_debug_info || 'Stored password matched (normalized); ';
    ELSIF v_stored_password = p_password THEN
      v_requires_password_change := FALSE; 
      v_debug_info := v_debug_info || 'Stored password matched (exact); ';
    ELSIF TRIM(v_stored_password) = TRIM(p_password) THEN
      v_requires_password_change := FALSE;
      v_debug_info := v_debug_info || 'Stored password matched (trimmed); ';
    ELSE
      -- If none of the comparison methods work, authentication fails
      v_debug_info := v_debug_info || 'Password mismatch; ';
      RETURN QUERY SELECT 
        NULL::bigint, 
        NULL::text, 
        NULL::text, 
        NULL::text, 
        NULL::text, 
        NULL::text, 
        NULL::bigint, 
        NULL::text, 
        NULL::text, 
        NULL::boolean,
        FALSE::boolean,
        v_debug_info;
      RETURN;
    END IF;
  ELSE
    -- If stored password is NULL, authentication fails
    v_debug_info := v_debug_info || 'No stored password available; ';
    RETURN QUERY SELECT 
      NULL::bigint, 
      NULL::text, 
      NULL::text, 
      NULL::text, 
      NULL::text, 
      NULL::text, 
      NULL::bigint, 
      NULL::text, 
      NULL::text, 
      NULL::boolean,
      FALSE::boolean,
      v_debug_info;
    RETURN;
  END IF;

  -- Return the authenticated user data with debug info
  RETURN QUERY
  SELECT
    a.account_number::bigint,
    COALESCE(a.acct_name, '')::text,
    COALESCE(a.address, '')::text,
    COALESCE(a.city, '')::text,
    COALESCE(a.state, '')::text,
    COALESCE(a.zip, '')::text,
    a.account_number::bigint as id,  -- Use account_number as id
    COALESCE(a.email_address, '')::text,       
    COALESCE(a.mobile_phone, '')::text,        
    v_requires_password_change,
    v_is_special_admin,
    v_debug_info
  FROM accounts_lcmd a
  WHERE a.account_number = v_account_number;
END;
$$;

-- Ensure execute permission is granted
GRANT EXECUTE ON FUNCTION authenticate_user_lcmd(text, text) TO anon, authenticated;

-- Ensure the function is owned by postgres (important for SECURITY DEFINER)
ALTER FUNCTION authenticate_user_lcmd(text, text) OWNER TO postgres;
