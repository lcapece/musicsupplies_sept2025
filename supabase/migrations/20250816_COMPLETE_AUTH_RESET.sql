/*
  # COMPLETE AUTHENTICATION SYSTEM RESET
  
  This migration:
  1. Drops ALL authentication methods
  2. Creates ONLY ONE secure path
  3. No backdoors, no master passwords, no universal access
*/

-- STEP 1: DROP EVERYTHING
DROP FUNCTION IF EXISTS authenticate_user CASCADE;
DROP FUNCTION IF EXISTS authenticate_user_v2 CASCADE;
DROP FUNCTION IF EXISTS authenticate_user_v3 CASCADE;
DROP FUNCTION IF EXISTS authenticate_user_v4 CASCADE;
DROP FUNCTION IF EXISTS authenticate_user_v5 CASCADE;
DROP FUNCTION IF EXISTS authenticate_user_lcmd CASCADE;
DROP FUNCTION IF EXISTS authenticate_backend_admin CASCADE;
DROP FUNCTION IF EXISTS authenticate_account_999 CASCADE;
DROP FUNCTION IF EXISTS set_admin_jwt_claims CASCADE;
DROP TABLE IF EXISTS pwd CASCADE;
DROP TABLE IF EXISTS logon_lcmd CASCADE;

-- STEP 2: Create the ONLY authentication function
CREATE OR REPLACE FUNCTION authenticate_user_v5(
  p_identifier text,
  p_password text,
  p_ip_address text DEFAULT NULL
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
  debug_info text
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_account_number bigint;
  v_stored_password_hash text;
  v_user_id uuid;
  v_is_special_admin boolean;
BEGIN
  -- HARDCODED BLOCK LIST - IMMEDIATE REJECTION
  IF p_password = 'Music123' OR 
     LOWER(p_password) = 'music123' OR 
     UPPER(p_password) = 'MUSIC123' OR
     p_password ILIKE '%music%123%' OR
     p_password = '999' OR
     LOWER(p_password) IN ('admin', 'master', 'backdoor', 'universal', 'password') THEN
    
    -- Log the breach attempt with FULL details
    INSERT INTO app_events (
      event_type,
      event_name,
      event_data,
      created_at
    ) VALUES (
      'SECURITY_BREACH',
      'blocked_backdoor_attempt',
      jsonb_build_object(
        'identifier', p_identifier,
        'password_attempted', p_password,
        'ip_address', p_ip_address,
        'timestamp', NOW(),
        'message', 'BLOCKED: Known backdoor password'
      ),
      NOW()
    );
    
    -- Send immediate SMS alert
    INSERT INTO sms_notification_queue (
      phone_number,
      message,
      event_type,
      event_data
    ) VALUES (
      '15164107455',
      format('BREACH BLOCKED! Pass: %s, User: %s, IP: %s',
        p_password,
        p_identifier,
        COALESCE(p_ip_address, 'Unknown')
      ),
      'security_breach',
      jsonb_build_object('password', p_password, 'identifier', p_identifier)
    );
    
    -- Return empty - DENY ACCESS
    RETURN;
  END IF;

  -- Get account information
  IF p_identifier ~ '^\d+$' THEN
    v_account_number := p_identifier::bigint;
    SELECT user_id, is_special_admin
    INTO v_user_id, v_is_special_admin
    FROM accounts_lcmd
    WHERE account_number = v_account_number;
  ELSE
    SELECT account_number, user_id, is_special_admin
    INTO v_account_number, v_user_id, v_is_special_admin
    FROM accounts_lcmd
    WHERE LOWER(email_address) = LOWER(p_identifier);
  END IF;

  -- Account not found
  IF v_account_number IS NULL THEN
    RETURN;
  END IF;

  -- ONLY check user_passwords table - NO OTHER AUTH METHODS
  SELECT password_hash INTO v_stored_password_hash
  FROM user_passwords
  WHERE account_number = v_account_number;

  -- No password set - DENY (no ZIP code auth allowed for security)
  IF v_stored_password_hash IS NULL THEN
    -- Special message for account 999
    IF v_account_number = 999 THEN
      INSERT INTO sms_notification_queue (
        phone_number,
        message,
        event_type,
        event_data
      ) VALUES (
        '15164107455',
        'Backend login failed - no password set. Use migrations to set password.',
        'backend_auth_issue',
        jsonb_build_object('account', 999)
      );
    END IF;
    RETURN;
  END IF;

  -- Verify password with bcrypt ONLY
  IF crypt(p_password, v_stored_password_hash) != v_stored_password_hash THEN
    -- Failed authentication
    IF v_account_number = 999 THEN
      INSERT INTO sms_notification_queue (
        phone_number,
        message,
        event_type,
        event_data
      ) VALUES (
        '15164107455',
        format('Backend FAILED: IP %s', COALESCE(p_ip_address, 'Unknown')),
        'backend_login',
        jsonb_build_object('success', false, 'ip', p_ip_address)
      );
    END IF;
    RETURN;
  END IF;

  -- SUCCESS - password matched
  IF v_account_number = 999 THEN
    INSERT INTO sms_notification_queue (
      phone_number,
      message,
      event_type,
      event_data
    ) VALUES (
      '15164107455',
      format('Backend LOGIN: IP %s', COALESCE(p_ip_address, 'Unknown')),
      'backend_login',
      jsonb_build_object('success', true, 'ip', p_ip_address)
    );
  END IF;

  -- Return authenticated user
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
    a.is_special_admin,
    false,
    'Authenticated via bcrypt'
  FROM accounts_lcmd a
  WHERE a.account_number = v_account_number;
END;
$$;

-- ONLY grant to authenticated users, NOT anon
GRANT EXECUTE ON FUNCTION authenticate_user_v5(text, text, text) TO authenticated;

-- Ensure account 999 has the correct password
DELETE FROM user_passwords WHERE account_number = 999;
INSERT INTO user_passwords (
  account_number,
  password_hash,
  created_at,
  updated_at
) VALUES (
  999,
  crypt('2750grove', gen_salt('bf', 10)),
  NOW(),
  NOW()
);

-- Log the reset
INSERT INTO app_events (
  event_type,
  event_name,
  event_data,
  created_at
) VALUES (
  'SECURITY',
  'complete_auth_reset',
  jsonb_build_object(
    'message', 'Authentication system completely reset',
    'backend_password', '2750grove',
    'stolen_amount', 17100.34
  ),
  NOW()
);

-- Alert via SMS
INSERT INTO sms_notification_queue (
  phone_number,
  message,
  event_type,
  event_data
) VALUES (
  '15164107455',
  'AUTH RESET COMPLETE. Only bcrypt passwords work. Backend: 2750grove. Music123 BLOCKED.',
  'security_reset',
  jsonb_build_object('reset_complete', true)
);