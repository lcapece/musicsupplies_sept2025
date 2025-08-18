/*
  # Simplified SMS Notification System
  
  Creates a queue table for SMS notifications that Edge Functions can monitor
  This approach is more reliable than direct HTTP calls from triggers
*/

-- Create SMS notification queue table
CREATE TABLE IF NOT EXISTS sms_notification_queue (
  id SERIAL PRIMARY KEY,
  phone_number TEXT NOT NULL,
  message TEXT NOT NULL,
  event_type TEXT NOT NULL,
  event_data JSONB,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  sent_at TIMESTAMPTZ,
  error_message TEXT
);

-- Create index for efficient polling
CREATE INDEX IF NOT EXISTS idx_sms_queue_pending ON sms_notification_queue(status) WHERE status = 'pending';

-- RLS policies for SMS queue
ALTER TABLE sms_notification_queue ENABLE ROW LEVEL SECURITY;

-- Allow service role to manage SMS queue
CREATE POLICY "Service role can manage SMS queue" ON sms_notification_queue
  FOR ALL USING (true);

-- Function to queue order SMS notification
CREATE OR REPLACE FUNCTION queue_order_sms_notification()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Queue SMS notification for new order
  INSERT INTO sms_notification_queue (
    phone_number,
    message,
    event_type,
    event_data
  ) VALUES (
    '15164107455',
    format(
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
    ),
    'new_order',
    jsonb_build_object(
      'order_number', NEW.order_number,
      'account_id', NEW.account_id,
      'total_amount', NEW.total_amount,
      'total_items', NEW.total_items
    )
  );
  
  RETURN NEW;
END;
$$;

-- Create trigger for new orders
DROP TRIGGER IF EXISTS trigger_queue_order_sms ON web_orders;
CREATE TRIGGER trigger_queue_order_sms
  AFTER INSERT ON web_orders
  FOR EACH ROW
  EXECUTE FUNCTION queue_order_sms_notification();

-- Function to queue backend login SMS notification
CREATE OR REPLACE FUNCTION queue_backend_login_sms(
  p_account_number bigint,
  p_identifier text,
  p_ip_address text,
  p_success boolean
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Only queue for backend account (999)
  IF p_account_number = 999 THEN
    INSERT INTO sms_notification_queue (
      phone_number,
      message,
      event_type,
      event_data
    ) VALUES (
      '15164107455',
      format(
        'BACKEND LOGIN %s
IP: %s
Time: %s
User: %s',
        CASE WHEN p_success THEN 'SUCCESS' ELSE 'FAILED' END,
        COALESCE(p_ip_address, 'Unknown'),
        TO_CHAR(NOW() AT TIME ZONE 'America/New_York', 'MM/DD HH12:MI AM'),
        p_identifier
      ),
      'backend_login',
      jsonb_build_object(
        'account_number', p_account_number,
        'identifier', p_identifier,
        'ip_address', p_ip_address,
        'success', p_success
      )
    );
  END IF;
END;
$$;

-- Update authenticate_user_v5 to use the queue function
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
BEGIN
  -- CRITICAL: NO UNIVERSAL PASSWORDS ALLOWED
  
  -- Step 1: Identify the account (by account number or email)
  IF p_identifier ~ '^\d+$' THEN
    v_account_number := p_identifier::bigint;
    
    SELECT a.zip, a.acct_name, a.user_id, 
           CASE WHEN a.account_number = 999 THEN true ELSE false END
    INTO v_zip, v_acct_name, v_user_id, v_is_special_admin
    FROM accounts_lcmd a
    WHERE a.account_number = v_account_number;
  ELSE
    SELECT a.account_number, a.zip, a.acct_name, a.user_id,
           CASE WHEN a.account_number = 999 THEN true ELSE false END
    INTO v_account_number, v_zip, v_acct_name, v_user_id, v_is_special_admin
    FROM accounts_lcmd a
    WHERE LOWER(a.email_address) = LOWER(p_identifier);
  END IF;

  IF v_account_number IS NULL THEN
    v_debug_info := 'Account not found for identifier: ' || p_identifier;
    
    -- Queue SMS for failed backend login attempt if it was for account 999
    IF p_identifier = '999' THEN
      PERFORM queue_backend_login_sms(999, p_identifier, p_ip_address, false);
    END IF;
    
    RETURN;
  END IF;

  -- Step 2: Check password in user_passwords table (using bcrypt)
  SELECT password_hash
  INTO v_stored_password_hash
  FROM user_passwords
  WHERE account_number = v_account_number;

  IF v_stored_password_hash IS NOT NULL THEN
    IF crypt(p_password, v_stored_password_hash) = v_stored_password_hash THEN
      v_debug_info := 'Authentication successful via user_passwords (bcrypt)';
      v_auth_success := true;
    ELSE
      v_debug_info := 'Password mismatch in user_passwords';
      v_auth_success := false;
    END IF;
  ELSE
    -- Check for ZIP code authentication (only for accounts without passwords)
    IF v_zip IS NOT NULL AND v_acct_name IS NOT NULL AND LENGTH(v_zip) >= 5 THEN
      DECLARE
        v_expected_zip_password text;
      BEGIN
        v_expected_zip_password := LOWER(SUBSTRING(v_acct_name FROM 1 FOR 1) || SUBSTRING(v_zip FROM 1 FOR 5));
        
        IF LOWER(p_password) = v_expected_zip_password THEN
          v_debug_info := 'ZIP code authentication - password initialization required';
          v_auth_success := true;
          
          -- Queue SMS for backend login if account 999
          IF v_account_number = 999 THEN
            PERFORM queue_backend_login_sms(v_account_number, p_identifier, p_ip_address, true);
          END IF;
          
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

  -- Step 3: Queue SMS notification for backend (account 999) login attempts
  IF v_account_number = 999 THEN
    PERFORM queue_backend_login_sms(v_account_number, p_identifier, p_ip_address, v_auth_success);
  END IF;

  -- Step 4: Return result based on authentication success
  IF NOT v_auth_success THEN
    RETURN;
  END IF;

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
    v_is_special_admin,
    false,
    v_debug_info
  FROM accounts_lcmd a
  WHERE a.account_number = v_account_number;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION authenticate_user_v5(text, text, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION queue_backend_login_sms(bigint, text, text, boolean) TO authenticated;

-- Create a function to manually send test SMS
CREATE OR REPLACE FUNCTION send_test_sms(p_message text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO sms_notification_queue (
    phone_number,
    message,
    event_type,
    event_data
  ) VALUES (
    '15164107455',
    p_message,
    'test',
    jsonb_build_object('test', true)
  );
END;
$$;

GRANT EXECUTE ON FUNCTION send_test_sms(text) TO authenticated;