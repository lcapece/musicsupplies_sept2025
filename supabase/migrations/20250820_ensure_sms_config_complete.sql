-- Ensure complete SMS configuration for 2FA and admin notifications
-- This migration ensures all required tables and configuration exist

-- Ensure app_config table exists for storing ClickSend API credentials
CREATE TABLE IF NOT EXISTS app_config (
  id SERIAL PRIMARY KEY,
  config_key VARCHAR(100) UNIQUE NOT NULL,
  config_value TEXT,
  encrypted_value TEXT,
  decrypted_value TEXT, -- This should be a computed column or view
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  updated_by VARCHAR(50)
);

-- Enable RLS on app_config
ALTER TABLE app_config ENABLE ROW LEVEL SECURITY;

-- Create RLS policy for app_config
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'app_config' 
    AND policyname = 'Allow authenticated access to app config'
  ) THEN
    CREATE POLICY "Allow authenticated access to app config" 
    ON app_config FOR SELECT 
    TO authenticated, anon USING (true);
  END IF;
END
$$;

-- Grant permissions on app_config
GRANT SELECT ON app_config TO authenticated, anon;

-- Insert ClickSend API configuration placeholders if they don't exist
-- Note: These should be set with real values via environment variables or manual insertion
INSERT INTO app_config (config_key, config_value, description, updated_by) VALUES
('CLICKSEND_USERNAME', '', 'ClickSend API username for SMS sending', 'system'),
('CLICKSEND_API_KEY', '', 'ClickSend API key for SMS sending', 'system')
ON CONFLICT (config_key) DO NOTHING;

-- Create a function to test SMS configuration
CREATE OR REPLACE FUNCTION test_sms_config()
RETURNS TABLE(
  table_name TEXT,
  exists_check BOOLEAN,
  record_count BIGINT,
  description TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Check sms_notification_settings table
  RETURN QUERY
  SELECT 
    'sms_notification_settings'::TEXT,
    EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'sms_notification_settings')::BOOLEAN,
    COALESCE((SELECT COUNT(*) FROM sms_notification_settings), 0)::BIGINT,
    'SMS notification configuration table'::TEXT;
    
  -- Check 2fa table
  RETURN QUERY
  SELECT 
    '2fa'::TEXT,
    EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = '2fa' AND table_schema = 'public')::BOOLEAN,
    COALESCE((SELECT COUNT(*) FROM public."2fa"), 0)::BIGINT,
    'Legacy 2FA phone numbers table'::TEXT;
    
  -- Check two_factor_codes table
  RETURN QUERY
  SELECT 
    'two_factor_codes'::TEXT,
    EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'two_factor_codes')::BOOLEAN,
    COALESCE((SELECT COUNT(*) FROM two_factor_codes), 0)::BIGINT,
    'Two-factor authentication codes table'::TEXT;
    
  -- Check app_config table
  RETURN QUERY
  SELECT 
    'app_config'::TEXT,
    EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'app_config')::BOOLEAN,
    COALESCE((SELECT COUNT(*) FROM app_config), 0)::BIGINT,
    'Application configuration table'::TEXT;
    
  -- Check for 2FA_LOGIN event in sms_notification_settings
  RETURN QUERY
  SELECT 
    '2FA_LOGIN event'::TEXT,
    EXISTS (SELECT 1 FROM sms_notification_settings WHERE event_name = '2FA_LOGIN')::BOOLEAN,
    COALESCE((SELECT COUNT(*) FROM sms_notification_settings WHERE event_name = '2FA_LOGIN'), 0)::BIGINT,
    'SMS notification setting for 2FA login'::TEXT;
END;
$$;

-- Grant execute permission on the test function
GRANT EXECUTE ON FUNCTION test_sms_config() TO authenticated, anon;

-- Create a function to get SMS configuration status
CREATE OR REPLACE FUNCTION get_sms_status()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result JSON;
BEGIN
  SELECT json_build_object(
    'sms_notification_settings', (
      SELECT json_build_object(
        'exists', EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'sms_notification_settings'),
        'count', COALESCE((SELECT COUNT(*) FROM sms_notification_settings), 0),
        '2fa_login_configured', EXISTS (SELECT 1 FROM sms_notification_settings WHERE event_name = '2FA_LOGIN')
      )
    ),
    'two_fa_table', (
      SELECT json_build_object(
        'exists', EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = '2fa' AND table_schema = 'public'),
        'count', COALESCE((SELECT COUNT(*) FROM public."2fa"), 0),
        'phone_numbers', COALESCE((SELECT array_agg(phonenumber) FROM public."2fa"), ARRAY[]::TEXT[])
      )
    ),
    'two_factor_codes', (
      SELECT json_build_object(
        'exists', EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'two_factor_codes'),
        'count', COALESCE((SELECT COUNT(*) FROM two_factor_codes), 0),
        'active_codes', COALESCE((SELECT COUNT(*) FROM two_factor_codes WHERE used = false AND expires_at > NOW()), 0)
      )
    ),
    'app_config', (
      SELECT json_build_object(
        'exists', EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'app_config'),
        'count', COALESCE((SELECT COUNT(*) FROM app_config), 0),
        'clicksend_configured', EXISTS (SELECT 1 FROM app_config WHERE config_key = 'CLICKSEND_USERNAME' AND config_value != '')
      )
    )
  ) INTO result;
  
  RETURN result;
END;
$$;

-- Grant execute permission on the status function
GRANT EXECUTE ON FUNCTION get_sms_status() TO authenticated, anon;

COMMENT ON FUNCTION test_sms_config() IS 'Test function to check SMS configuration completeness';
COMMENT ON FUNCTION get_sms_status() IS 'Get comprehensive SMS system status and configuration';