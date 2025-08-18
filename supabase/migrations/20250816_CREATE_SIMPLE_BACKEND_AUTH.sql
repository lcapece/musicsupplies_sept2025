/*
  # Create Simple Backend Authentication for Account 999
  
  Direct authentication function specifically for backend admin
*/

-- Create a dedicated backend authentication function
CREATE OR REPLACE FUNCTION authenticate_backend_admin(
  p_password text,
  p_ip_address text DEFAULT NULL
)
RETURNS TABLE(
  success boolean,
  message text
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_stored_hash text;
  v_auth_success boolean := false;
BEGIN
  -- BLOCK Music123 and other backdoors
  IF LOWER(p_password) IN ('music123', '999', 'admin', 'master', 'backdoor') THEN
    -- Log breach attempt
    INSERT INTO app_events (
      event_type,
      event_name,
      event_data,
      created_at
    ) VALUES (
      'SECURITY_BREACH',
      'backend_backdoor_attempt',
      jsonb_build_object(
        'password_pattern', p_password,
        'ip_address', p_ip_address
      ),
      NOW()
    );
    
    RETURN QUERY SELECT false, 'Invalid password';
    RETURN;
  END IF;

  -- Get the password hash for account 999
  SELECT password_hash INTO v_stored_hash
  FROM user_passwords
  WHERE account_number = 999;

  IF v_stored_hash IS NULL THEN
    -- No password set - this shouldn't happen
    RETURN QUERY SELECT false, 'Backend account not configured';
    RETURN;
  END IF;

  -- Verify the password
  IF crypt(p_password, v_stored_hash) = v_stored_hash THEN
    v_auth_success := true;
    
    -- Log successful login
    INSERT INTO app_events (
      event_type,
      event_name,
      event_data,
      created_at
    ) VALUES (
      'AUTH',
      'backend_login_success',
      jsonb_build_object(
        'account', 999,
        'ip_address', p_ip_address
      ),
      NOW()
    );
    
    -- Queue SMS notification
    INSERT INTO sms_notification_queue (
      phone_number,
      message,
      event_type,
      event_data
    ) VALUES (
      '15164107455',
      format('Backend LOGIN SUCCESS. IP: %s, Time: %s',
        COALESCE(p_ip_address, 'Unknown'),
        TO_CHAR(NOW() AT TIME ZONE 'America/New_York', 'MM/DD HH12:MI AM')
      ),
      'backend_login',
      jsonb_build_object('success', true, 'ip', p_ip_address)
    );
    
    RETURN QUERY SELECT true, 'Authentication successful';
  ELSE
    -- Password failed
    INSERT INTO app_events (
      event_type,
      event_name,
      event_data,
      created_at
    ) VALUES (
      'AUTH',
      'backend_login_failed',
      jsonb_build_object(
        'account', 999,
        'ip_address', p_ip_address
      ),
      NOW()
    );
    
    -- Queue SMS alert for failed attempt
    INSERT INTO sms_notification_queue (
      phone_number,
      message,
      event_type,
      event_data
    ) VALUES (
      '15164107455',
      format('Backend LOGIN FAILED! IP: %s, Time: %s',
        COALESCE(p_ip_address, 'Unknown'),
        TO_CHAR(NOW() AT TIME ZONE 'America/New_York', 'MM/DD HH12:MI AM')
      ),
      'backend_login',
      jsonb_build_object('success', false, 'ip', p_ip_address)
    );
    
    RETURN QUERY SELECT false, 'Invalid password';
  END IF;
END;
$$;

-- Create a function to test the password directly
CREATE OR REPLACE FUNCTION test_backend_password()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_hash text;
  v_result text;
BEGIN
  -- Get current hash
  SELECT password_hash INTO v_hash
  FROM user_passwords
  WHERE account_number = 999;
  
  IF v_hash IS NULL THEN
    RETURN 'ERROR: No password set for account 999';
  END IF;
  
  -- Test if "2750grove" works
  IF crypt('2750grove', v_hash) = v_hash THEN
    RETURN 'SUCCESS: Password "2750grove" is working correctly for account 999';
  ELSE
    RETURN 'FAILED: Password "2750grove" does not match stored hash';
  END IF;
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION authenticate_backend_admin(text, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION test_backend_password() TO authenticated;

-- Test the password right now
SELECT test_backend_password();

COMMENT ON FUNCTION authenticate_backend_admin(text, text) IS 
'Dedicated backend admin authentication. Password: 2750grove. Sends SMS on all attempts.';

COMMENT ON FUNCTION test_backend_password() IS 
'Tests if backend password 2750grove is working correctly.';