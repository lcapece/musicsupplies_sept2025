-- Add SMS notification setting for 2FA_LOGIN event
-- This enables SMS sending for admin account 999 2FA login attempts

-- Ensure sms_notification_settings table exists (should already exist from previous migration)
CREATE TABLE IF NOT EXISTS sms_notification_settings (
  id SERIAL PRIMARY KEY,
  event_name TEXT UNIQUE NOT NULL,
  notification_phones TEXT[] NOT NULL,
  is_enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add the 2FA_LOGIN event with admin phone numbers
INSERT INTO sms_notification_settings (event_name, notification_phones, is_enabled)
VALUES ('2FA_LOGIN', ARRAY['15164107455', '18003215584'], true)
ON CONFLICT (event_name) 
DO UPDATE SET 
  notification_phones = EXCLUDED.notification_phones,
  is_enabled = true,
  updated_at = NOW();

-- Ensure the 2fa table exists (should already exist from previous migration)
CREATE TABLE IF NOT EXISTS public."2fa" (
    id SERIAL PRIMARY KEY,
    phonenumber TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Ensure phone numbers are in the 2fa table as fallback
INSERT INTO public."2fa" (phonenumber) VALUES 
  ('+15164107455'),
  ('+18003215584')
ON CONFLICT DO NOTHING;

-- Ensure two_factor_codes table exists (should already exist from previous migration)
CREATE TABLE IF NOT EXISTS public.two_factor_codes (
    id SERIAL PRIMARY KEY,
    account_number INTEGER NOT NULL,
    code VARCHAR(6) NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    expires_at TIMESTAMP NOT NULL,
    used BOOLEAN DEFAULT FALSE,
    ip_address TEXT
);

-- Create index if it doesn't exist
CREATE INDEX IF NOT EXISTS idx_2fa_codes_lookup 
ON two_factor_codes(account_number, code, used, expires_at);

-- Grant necessary permissions
GRANT SELECT ON sms_notification_settings TO authenticated, anon;
GRANT SELECT ON public."2fa" TO authenticated, anon;
GRANT ALL ON two_factor_codes TO authenticated, anon;

-- Enable RLS if not already enabled
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
    AND c.relname = 'sms_notification_settings'
    AND c.relrowsecurity = true
  ) THEN
    ALTER TABLE sms_notification_settings ENABLE ROW LEVEL SECURITY;
  END IF;
END
$$;

-- Create RLS policies if they don't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'sms_notification_settings' 
    AND policyname = 'Allow read access to notification settings'
  ) THEN
    CREATE POLICY "Allow read access to notification settings" 
    ON sms_notification_settings FOR SELECT 
    TO authenticated, anon USING (true);
  END IF;
END
$$;

COMMENT ON TABLE sms_notification_settings IS 'SMS notification configuration for various events including 2FA login';