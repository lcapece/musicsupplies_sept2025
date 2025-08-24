-- Update authenticate_user function to use new admin_logins table and validate_admin_login_code for 2FA

CREATE OR REPLACE FUNCTION public.authenticate_user(
  p_identifier text,
  p_password text,
  p_ip_address text DEFAULT NULL,
  p_2fa_code text DEFAULT NULL
)
RETURNS TABLE (
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
  requires_2fa boolean,
  needs_password_initialization boolean,
  debug_info jsonb
) 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_account_number bigint;
  v_stored_password text;
  v_is_email boolean;
  v_user_id uuid;
  v_is_admin_999 boolean := false;
  v_admin_password_valid boolean := false;
  v_2fa_required boolean := false;
  v_2fa_valid boolean := false;
  v_debug jsonb := '{}'::jsonb;
  v_needs_password_init boolean := false;
BEGIN
  -- Initialize debug info
  v_debug := jsonb_build_object(
    'identifier', p_identifier,
    'is_2fa_attempt', p_2fa_code IS NOT NULL,
    'timestamp', now()
  );

  -- Determine if identifier is email
  v_is_email := p_identifier LIKE '%@%';
  
  -- Get account number
  IF v_is_email THEN
    SELECT a.account_number INTO v_account_number
    FROM accounts_lcmd a
    WHERE LOWER(a.email_address) = LOWER(p_identifier);
  ELSE
    -- Try to parse as account number
    BEGIN
      v_account_number := p_identifier::bigint;
    EXCEPTION WHEN OTHERS THEN
      v_account_number := NULL;
    END;
  END IF;

  -- Check if this is admin 999
  v_is_admin_999 := (v_account_number = 999);
  v_debug := v_debug || jsonb_build_object('is_admin_999', v_is_admin_999);

  -- If no account found, return empty
  IF v_account_number IS NULL THEN
    v_debug := v_debug || jsonb_build_object('error', 'Account not found');
    RETURN;
  END IF;

  -- Get stored password
  SELECT password_hash INTO v_stored_password
  FROM accounts_lcmd
  WHERE account_number = v_account_number;

  -- For admin 999, validate password using is_admin_password_valid
  IF v_is_admin_999 THEN
    v_admin_password_valid := public.is_admin_password_valid(p_password);
    v_debug := v_debug || jsonb_build_object('admin_password_valid', v_admin_password_valid);
    
    IF v_admin_password_valid THEN
      -- Admin 999 always requires 2FA
      v_2fa_required := true;
      
      -- If 2FA code provided, validate it using the new function
      IF p_2fa_code IS NOT NULL THEN
        v_2fa_valid := public.validate_admin_login_code(999, p_2fa_code);
        v_debug := v_debug || jsonb_build_object('2fa_valid', v_2fa_valid);
        
        IF NOT v_2fa_valid THEN
          -- Invalid 2FA code
          v_debug := v_debug || jsonb_build_object('error', 'Invalid 2FA code');
          RETURN;
        END IF;
      ELSE
        -- No 2FA code provided, return requires_2fa = true
        RETURN QUERY
        SELECT 
          a.account_number,
          a.acct_name,
          a.address,
          a.city,
          a.state,
          a.zip,
          a.user_id as id,
          a.email_address,
          a.phone,
          a.mobile_phone,
          false as requires_password_change,
          true as is_special_admin,
          true as requires_2fa,  -- Signal 2FA required
          false as needs_password_initialization,
          v_debug as debug_info
        FROM accounts_lcmd a
        WHERE a.account_number = 999;
        RETURN;
      END IF;
    ELSE
      -- Invalid admin password
      v_debug := v_debug || jsonb_build_object('error', 'Invalid admin password');
      RETURN;
    END IF;
  ELSE
    -- Non-admin authentication
    -- Check for ZIP code authentication (password initialization flow)
    IF v_stored_password IS NULL OR v_stored_password = '' THEN
      -- Check if password matches ZIP code
      DECLARE
        v_zip text;
      BEGIN
        SELECT zip INTO v_zip FROM accounts_lcmd WHERE account_number = v_account_number;
        IF v_zip IS NOT NULL AND TRIM(v_zip) = TRIM(p_password) THEN
          v_needs_password_init := true;
          v_debug := v_debug || jsonb_build_object('zip_auth', true);
        ELSE
          v_debug := v_debug || jsonb_build_object('error', 'Invalid password (no password set)');
          RETURN;
        END IF;
      END;
    ELSIF v_stored_password != p_password THEN
      -- Password doesn't match
      v_debug := v_debug || jsonb_build_object('error', 'Invalid password');
      RETURN;
    END IF;
  END IF;

  -- Return user data
  RETURN QUERY
  SELECT 
    a.account_number,
    a.acct_name,
    a.address,
    a.city,
    a.state,
    a.zip,
    a.user_id as id,
    a.email_address,
    a.phone,
    a.mobile_phone,
    COALESCE(a.requires_password_change, false) as requires_password_change,
    (a.account_number = 999) as is_special_admin,
    false as requires_2fa,  -- Already validated if we get here
    v_needs_password_init as needs_password_initialization,
    v_debug as debug_info
  FROM accounts_lcmd a
  WHERE a.account_number = v_account_number;

END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.authenticate_user(text, text, text, text) TO anon, authenticated;
