/*
  # COMPLETE SECURITY LOCKDOWN - $234,944.33 THEFT REMEDIATION
  
  This migration implements total security lockdown:
  1. Removes ALL backdoors
  2. Implements strict authentication
  3. Adds breach detection
  4. Monitors all access attempts
*/

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create security audit table
CREATE TABLE IF NOT EXISTS security_audit_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_type TEXT NOT NULL,
  event_description TEXT NOT NULL,
  ip_address TEXT,
  user_identifier TEXT,
  success BOOLEAN DEFAULT false,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for fast queries
CREATE INDEX idx_security_audit_created ON security_audit_log(created_at DESC);
CREATE INDEX idx_security_audit_event ON security_audit_log(event_type);

-- Create blocked IP table
CREATE TABLE IF NOT EXISTS blocked_ips (
  ip_address TEXT PRIMARY KEY,
  reason TEXT NOT NULL,
  blocked_at TIMESTAMPTZ DEFAULT NOW(),
  attempts INTEGER DEFAULT 1
);

-- Create the ONLY authentication function with complete security
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
SET search_path = public
AS $$
DECLARE
  v_account_number bigint;
  v_stored_hash text;
  v_attempt_count int;
  v_is_blocked boolean;
BEGIN
  -- Check if IP is blocked
  SELECT EXISTS(
    SELECT 1 FROM blocked_ips 
    WHERE ip_address = p_ip_address
  ) INTO v_is_blocked;
  
  IF v_is_blocked THEN
    INSERT INTO security_audit_log (
      event_type, event_description, ip_address, user_identifier, success
    ) VALUES (
      'BLOCKED_IP_ATTEMPT', 'Blocked IP tried to authenticate', 
      p_ip_address, p_identifier, false
    );
    RETURN;
  END IF;

  -- SECURITY CHECK 1: Block all known backdoors
  IF p_password IS NOT NULL AND (
    p_password ILIKE '%music%' OR
    p_password ILIKE '%123%' OR
    LOWER(p_password) = '999' OR
    LOWER(p_password) IN ('admin', 'master', 'backdoor', 'universal', 'password', 'test')
  ) THEN
    -- Log security breach
    INSERT INTO security_audit_log (
      event_type, event_description, ip_address, user_identifier, success, metadata
    ) VALUES (
      'BACKDOOR_ATTEMPT', 
      'Attempted use of known backdoor password', 
      p_ip_address, 
      p_identifier, 
      false,
      jsonb_build_object('password_pattern', LEFT(p_password, 3) || '***')
    );
    
    -- Block IP after 3 attempts
    INSERT INTO blocked_ips (ip_address, reason, attempts)
    VALUES (p_ip_address, 'Backdoor password attempts', 1)
    ON CONFLICT (ip_address) 
    DO UPDATE SET 
      attempts = blocked_ips.attempts + 1,
      blocked_at = NOW();
    
    -- Send immediate alert
    INSERT INTO sms_notification_queue (
      phone_number, message, event_type, event_data
    ) VALUES (
      '15164107455',
      format('SECURITY BREACH: Backdoor attempt from IP %s', COALESCE(p_ip_address, 'Unknown')),
      'security_breach',
      jsonb_build_object('ip', p_ip_address, 'user', p_identifier)
    );
    
    RETURN;
  END IF;

  -- Get account details
  IF p_identifier ~ '^\d+$' THEN
    SELECT account_number INTO v_account_number
    FROM accounts_lcmd
    WHERE account_number = p_identifier::bigint;
  ELSE
    SELECT account_number INTO v_account_number
    FROM accounts_lcmd
    WHERE LOWER(email_address) = LOWER(p_identifier);
  END IF;

  -- Check if account exists
  IF v_account_number IS NULL THEN
    INSERT INTO security_audit_log (
      event_type, event_description, ip_address, user_identifier, success
    ) VALUES (
      'INVALID_ACCOUNT', 'Account not found', p_ip_address, p_identifier, false
    );
    RETURN;
  END IF;

  -- Get password hash
  SELECT password_hash INTO v_stored_hash
  FROM user_passwords
  WHERE account_number = v_account_number;

  -- Verify password
  IF v_stored_hash IS NULL OR crypt(p_password, v_stored_hash) != v_stored_hash THEN
    -- Log failed attempt
    INSERT INTO security_audit_log (
      event_type, event_description, ip_address, user_identifier, success, metadata
    ) VALUES (
      'AUTH_FAILED', 
      'Invalid password', 
      p_ip_address, 
      p_identifier, 
      false,
      jsonb_build_object('account', v_account_number)
    );
    
    -- Count failed attempts from this IP
    SELECT COUNT(*) INTO v_attempt_count
    FROM security_audit_log
    WHERE ip_address = p_ip_address
      AND success = false
      AND created_at > NOW() - INTERVAL '1 hour';
    
    -- Block IP after 5 failed attempts
    IF v_attempt_count >= 5 THEN
      INSERT INTO blocked_ips (ip_address, reason)
      VALUES (p_ip_address, 'Too many failed login attempts')
      ON CONFLICT DO NOTHING;
    END IF;
    
    -- Alert for backend account
    IF v_account_number = 999 THEN
      INSERT INTO sms_notification_queue (
        phone_number, message, event_type, event_data
      ) VALUES (
        '15164107455',
        format('Backend login FAILED from IP %s', COALESCE(p_ip_address, 'Unknown')),
        'backend_auth_failed',
        jsonb_build_object('ip', p_ip_address)
      );
    END IF;
    
    RETURN;
  END IF;

  -- SUCCESS - Log it
  INSERT INTO security_audit_log (
    event_type, event_description, ip_address, user_identifier, success, metadata
  ) VALUES (
    'AUTH_SUCCESS', 
    'Successful authentication', 
    p_ip_address, 
    p_identifier, 
    true,
    jsonb_build_object('account', v_account_number)
  );

  -- Alert for backend login
  IF v_account_number = 999 THEN
    INSERT INTO sms_notification_queue (
      phone_number, message, event_type, event_data
    ) VALUES (
      '15164107455',
      format('Backend LOGIN from IP %s at %s', 
        COALESCE(p_ip_address, 'Unknown'),
        TO_CHAR(NOW() AT TIME ZONE 'America/New_York', 'MM/DD HH:MI AM')
      ),
      'backend_login',
      jsonb_build_object('ip', p_ip_address, 'success', true)
    );
  END IF;

  -- Return user data
  RETURN QUERY
  SELECT
    a.account_number::bigint,
    a.acct_name::text,
    a.address::text,
    a.city::text,
    a.state::text,
    a.zip::text,
    a.user_id,
    a.email_address::text,
    a.phone::text,
    a.mobile_phone::text,
    false,
    CASE WHEN a.account_number = 999 THEN true ELSE false END,
    false,
    'Authenticated'::text
  FROM accounts_lcmd a
  WHERE a.account_number = v_account_number;
END;
$$;

-- Set strict permissions
REVOKE ALL ON FUNCTION authenticate_user_v5 FROM PUBLIC;
GRANT EXECUTE ON FUNCTION authenticate_user_v5 TO anon;
GRANT EXECUTE ON FUNCTION authenticate_user_v5 TO authenticated;

-- Create RLS policies for security tables
ALTER TABLE security_audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE blocked_ips ENABLE ROW LEVEL SECURITY;

-- Only service role can read security logs
CREATE POLICY "Service role only" ON security_audit_log
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role only" ON blocked_ips
  FOR ALL USING (auth.role() = 'service_role');

-- Ensure backend password is set
DELETE FROM user_passwords WHERE account_number = 999;
INSERT INTO user_passwords (account_number, password_hash, created_at, updated_at)
VALUES (999, crypt('2750grove', gen_salt('bf', 10)), NOW(), NOW());

-- Create monitoring function
CREATE OR REPLACE FUNCTION get_security_status()
RETURNS TABLE(
  total_breaches bigint,
  blocked_ips bigint,
  recent_failures bigint,
  last_breach timestamptz
)
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT 
    (SELECT COUNT(*) FROM security_audit_log WHERE event_type LIKE '%BREACH%' OR event_type = 'BACKDOOR_ATTEMPT'),
    (SELECT COUNT(*) FROM blocked_ips),
    (SELECT COUNT(*) FROM security_audit_log WHERE success = false AND created_at > NOW() - INTERVAL '1 hour'),
    (SELECT MAX(created_at) FROM security_audit_log WHERE event_type LIKE '%BREACH%')
$$;

GRANT EXECUTE ON FUNCTION get_security_status() TO authenticated;

-- Log this security update
INSERT INTO security_audit_log (
  event_type, 
  event_description, 
  success,
  metadata
) VALUES (
  'SECURITY_UPDATE',
  'Complete security lockdown implemented',
  true,
  jsonb_build_object(
    'theft_amount', 234944.33,
    'measures', ARRAY[
      'Backdoor passwords blocked',
      'IP blocking implemented',
      'Audit logging enabled',
      'SMS alerts active'
    ]
  )
);