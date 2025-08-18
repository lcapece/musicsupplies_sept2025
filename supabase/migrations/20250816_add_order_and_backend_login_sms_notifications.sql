/*
  # Add SMS Notifications for Orders and Backend Login Attempts
  
  This migration:
  1. Sets up SMS notifications for new orders to 1-516-410-7455
  2. Sets up SMS notifications for backend (account 999) login attempts with IP address
  3. Creates triggers to automatically send SMS on these events
*/

-- Ensure the sms_notification_settings table exists and has the necessary structure
CREATE TABLE IF NOT EXISTS sms_notification_settings (
  id SERIAL PRIMARY KEY,
  event_name TEXT UNIQUE NOT NULL,
  notification_phones TEXT[] NOT NULL,
  is_enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add notification settings for orders and backend login
INSERT INTO sms_notification_settings (event_name, notification_phones, is_enabled)
VALUES 
  ('new_order', ARRAY['15164107455'], true),
  ('backend_login_attempt', ARRAY['15164107455'], true)
ON CONFLICT (event_name) 
DO UPDATE SET 
  notification_phones = EXCLUDED.notification_phones,
  is_enabled = true,
  updated_at = NOW();

-- Create function to send order notification SMS
CREATE OR REPLACE FUNCTION notify_new_order_sms()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_message TEXT;
  v_response JSONB;
BEGIN
  -- Build SMS message with order details
  v_message := format(
    'NEW ORDER #%s
Customer: %s
Total: $%s
Items: %s
Time: %s',
    NEW.order_number,
    COALESCE(NEW.customer_name, 'Account ' || NEW.account_id::text),
    COALESCE(NEW.total_amount, 0)::decimal(10,2),
    COALESCE(NEW.total_items, 0),
    TO_CHAR(NOW() AT TIME ZONE 'America/New_York', 'MM/DD HH12:MI AM')
  );

  -- Call the send-admin-sms Edge Function
  SELECT
    net.http_post(
      url := CONCAT(
        current_setting('app.supabase_url', true),
        '/functions/v1/send-admin-sms'
      ),
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', CONCAT('Bearer ', current_setting('app.supabase_anon_key', true))
      ),
      body := jsonb_build_object(
        'eventName', 'new_order',
        'message', v_message,
        'additionalData', jsonb_build_object(
          'order_number', NEW.order_number,
          'account_id', NEW.account_id,
          'total_amount', NEW.total_amount
        )
      )
    ) INTO v_response;

  -- Log the notification attempt
  INSERT INTO app_events (
    event_type,
    event_name,
    event_data,
    created_at
  ) VALUES (
    'SMS_NOTIFICATION',
    'new_order_sms',
    jsonb_build_object(
      'order_number', NEW.order_number,
      'message', v_message,
      'response', v_response
    ),
    NOW()
  );

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log error but don't fail the order creation
    INSERT INTO app_events (
      event_type,
      event_name,
      event_data,
      created_at
    ) VALUES (
      'SMS_ERROR',
      'new_order_sms_failed',
      jsonb_build_object(
        'order_number', NEW.order_number,
        'error', SQLERRM
      ),
      NOW()
    );
    RETURN NEW;
END;
$$;

-- Create trigger for new orders
DROP TRIGGER IF EXISTS trigger_notify_new_order_sms ON web_orders;
CREATE TRIGGER trigger_notify_new_order_sms
  AFTER INSERT ON web_orders
  FOR EACH ROW
  EXECUTE FUNCTION notify_new_order_sms();

-- Update the authenticate_user_v5 function to send SMS for backend login attempts
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
  v_zip text;
  v_acct_name text;
  v_user_id uuid;
  v_is_special_admin boolean;
  v_debug_info text := '';
  v_auth_success boolean := false;
  v_message text;
  v_response jsonb;
BEGIN
  -- CRITICAL: NO UNIVERSAL PASSWORDS ALLOWED
  -- Remove any backdoor passwords like Music123, 999, etc.
  
  -- Step 1: Identify the account (by account number or email)
  IF p_identifier ~ '^\d+$' THEN
    -- Numeric identifier - treat as account number
    v_account_number := p_identifier::bigint;
    
    SELECT a.zip, a.acct_name, a.user_id, 
           CASE WHEN a.account_number = 999 THEN true ELSE false END
    INTO v_zip, v_acct_name, v_user_id, v_is_special_admin
    FROM accounts_lcmd a
    WHERE a.account_number = v_account_number;
  ELSE
    -- Non-numeric - treat as email
    SELECT a.account_number, a.zip, a.acct_name, a.user_id,
           CASE WHEN a.account_number = 999 THEN true ELSE false END
    INTO v_account_number, v_zip, v_acct_name, v_user_id, v_is_special_admin
    FROM accounts_lcmd a
    WHERE LOWER(a.email_address) = LOWER(p_identifier);
  END IF;

  -- If account not found, return empty
  IF v_account_number IS NULL THEN
    v_debug_info := 'Account not found for identifier: ' || p_identifier;
    RETURN;
  END IF;

  -- Step 2: Check password in user_passwords table (using bcrypt)
  SELECT password_hash
  INTO v_stored_password_hash
  FROM user_passwords
  WHERE account_number = v_account_number;

  IF v_stored_password_hash IS NOT NULL THEN
    -- Account has a custom password - verify with bcrypt
    IF crypt(p_password, v_stored_password_hash) = v_stored_password_hash THEN
      -- Password matches
      v_debug_info := 'Authentication successful via user_passwords (bcrypt)';
      v_auth_success := true;
    ELSE
      -- Password doesn't match - authentication fails
      v_debug_info := 'Password mismatch in user_passwords';
      v_auth_success := false;
    END IF;
  ELSE
    -- No custom password set - check if ZIP code authentication is allowed
    -- (Only for accounts that haven't set up a password yet)
    
    -- Check if the password matches the ZIP code pattern (first letter of name + 5 digit ZIP)
    IF v_zip IS NOT NULL AND v_acct_name IS NOT NULL AND LENGTH(v_zip) >= 5 THEN
      DECLARE
        v_expected_zip_password text;
      BEGIN
        v_expected_zip_password := LOWER(SUBSTRING(v_acct_name FROM 1 FOR 1) || SUBSTRING(v_zip FROM 1 FOR 5));
        
        IF LOWER(p_password) = v_expected_zip_password THEN
          -- ZIP code authentication successful - user needs to set up password
          v_debug_info := 'ZIP code authentication - password initialization required';
          v_auth_success := true;
          
          -- Return for ZIP code auth with password initialization flag
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
            false, -- requires_password_change
            v_is_special_admin,
            true, -- needs_password_initialization
            v_debug_info
          FROM accounts_lcmd a
          WHERE a.account_number = v_account_number;
          
          RETURN;
        END IF;
      END;
    END IF;
  END IF;

  -- Step 3: Send SMS notification for backend (account 999) login attempts
  IF v_account_number = 999 THEN
    BEGIN
      -- Build SMS message
      v_message := format(
        'BACKEND LOGIN %s
IP: %s
Time: %s
Identifier: %s',
        CASE WHEN v_auth_success THEN 'SUCCESS' ELSE 'FAILED' END,
        COALESCE(p_ip_address, 'Unknown'),
        TO_CHAR(NOW() AT TIME ZONE 'America/New_York', 'MM/DD HH12:MI AM'),
        p_identifier
      );

      -- Send SMS via Edge Function
      SELECT
        net.http_post(
          url := CONCAT(
            current_setting('app.supabase_url', true),
            '/functions/v1/send-admin-sms'
          ),
          headers := jsonb_build_object(
            'Content-Type', 'application/json',
            'Authorization', CONCAT('Bearer ', current_setting('app.supabase_anon_key', true))
          ),
          body := jsonb_build_object(
            'eventName', 'backend_login_attempt',
            'message', v_message,
            'additionalData', jsonb_build_object(
              'account_number', v_account_number,
              'ip_address', p_ip_address,
              'success', v_auth_success,
              'identifier', p_identifier
            )
          )
        ) INTO v_response;

      -- Log the notification
      INSERT INTO app_events (
        event_type,
        event_name,
        event_data,
        created_at
      ) VALUES (
        'SMS_NOTIFICATION',
        'backend_login_sms',
        jsonb_build_object(
          'account_number', v_account_number,
          'ip_address', p_ip_address,
          'success', v_auth_success,
          'message', v_message
        ),
        NOW()
      );
    EXCEPTION
      WHEN OTHERS THEN
        -- Log error but don't fail authentication
        INSERT INTO app_events (
          event_type,
          event_name,
          event_data,
          created_at
        ) VALUES (
          'SMS_ERROR',
          'backend_login_sms_failed',
          jsonb_build_object(
            'account_number', v_account_number,
            'error', SQLERRM
          ),
          NOW()
        );
    END;
  END IF;

  -- Step 4: Return result based on authentication success
  IF NOT v_auth_success THEN
    -- Authentication failed
    RETURN;
  END IF;

  -- Return authenticated user data
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
    false, -- requires_password_change (using new password system)
    v_is_special_admin,
    false, -- needs_password_initialization
    v_debug_info
  FROM accounts_lcmd a
  WHERE a.account_number = v_account_number;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION authenticate_user_v5(text, text, text) TO anon, authenticated;

-- Add comment documenting the SMS notification feature
COMMENT ON FUNCTION authenticate_user_v5(text, text, text) IS 
'SECURE authentication function with SMS notifications for backend login.
Sends SMS to 1-516-410-7455 for all account 999 login attempts with IP address.
No universal passwords allowed - Music123 backdoor removed.';

-- Create a simple function to test SMS sending
CREATE OR REPLACE FUNCTION test_sms_notification(p_message text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_response jsonb;
BEGIN
  SELECT
    net.http_post(
      url := CONCAT(
        current_setting('app.supabase_url', true),
        '/functions/v1/send-admin-sms'
      ),
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', CONCAT('Bearer ', current_setting('app.supabase_anon_key', true))
      ),
      body := jsonb_build_object(
        'eventName', 'test_notification',
        'message', p_message,
        'customPhones', ARRAY['15164107455']
      )
    ) INTO v_response;
    
  RETURN v_response;
END;
$$;

-- Grant execute permission for testing
GRANT EXECUTE ON FUNCTION test_sms_notification(text) TO authenticated;