/*
  # URGENT FIX: Reset Backend Password for Account 999
  
  Ensures account 999 can login with password: 2750grove
*/

-- First ensure the pgcrypto extension is enabled
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Ensure account 999 exists with proper data
INSERT INTO accounts_lcmd (
  account_number,
  acct_name,
  address,
  city,
  state,
  zip,
  email_address,
  phone
) VALUES (
  999,
  'Backend Admin',
  'System Account',
  'System',
  'SY',
  '00000',
  'admin@system.internal',
  '000-000-0000'
) ON CONFLICT (account_number) DO UPDATE SET
  acct_name = EXCLUDED.acct_name,
  email_address = EXCLUDED.email_address;

-- Delete any existing password for account 999 first
DELETE FROM user_passwords WHERE account_number = 999;

-- Now insert the correct hashed password for "2750grove"
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

-- Verify the password was set correctly by creating a test function
CREATE OR REPLACE FUNCTION verify_backend_password()
RETURNS TABLE(
  account_number bigint,
  has_password boolean,
  can_authenticate boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_hash text;
BEGIN
  -- Get the password hash for account 999
  SELECT password_hash INTO v_hash
  FROM user_passwords
  WHERE account_number = 999;

  RETURN QUERY
  SELECT 
    999::bigint,
    v_hash IS NOT NULL,
    crypt('2750grove', v_hash) = v_hash;
END;
$$;

-- Run the verification
SELECT * FROM verify_backend_password();

-- Log password reset
INSERT INTO app_events (
  event_type,
  event_name,
  event_data,
  created_at
) VALUES (
  'SECURITY',
  'backend_password_reset',
  jsonb_build_object(
    'account', 999,
    'action', 'Password reset to 2750grove',
    'timestamp', NOW()
  ),
  NOW()
);

-- Send SMS notification about password reset
INSERT INTO sms_notification_queue (
  phone_number,
  message,
  event_type,
  event_data
) VALUES (
  '15164107455',
  format('Backend password RESET. Account 999 password is now: 2750grove. Time: %s',
    TO_CHAR(NOW() AT TIME ZONE 'America/New_York', 'MM/DD HH12:MI AM')
  ),
  'password_reset',
  jsonb_build_object('account', 999, 'reset_time', NOW())
);

-- Grant execute permission
GRANT EXECUTE ON FUNCTION verify_backend_password() TO authenticated;

-- Add comment
COMMENT ON FUNCTION verify_backend_password() IS 'Verifies backend account 999 password is set correctly to 2750grove';