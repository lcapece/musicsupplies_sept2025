-- Set up 2FA system phones for account 999 admin login
-- Based on the existing system that uses sms_notification_settings and public."2fa" tables

-- 1. First populate sms_admins table (new approach from recent migrations)
INSERT INTO public.sms_admins (phone_number, is_active, notes) VALUES 
('+15164550980', true, 'Primary admin'),
('+15164107455', true, 'Secondary admin'), 
('+15167650816', true, 'Tertiary admin')
ON CONFLICT (phone_number) DO UPDATE SET is_active = true;

-- 2. Also ensure the legacy sms_notification_settings table has the phones (for fallback compatibility)
-- Ensure a row exists for '2FA_LOGIN'; if it exists, merge phones into the array.
WITH existing AS (
  SELECT id, notification_phones
  FROM public.sms_notification_settings
  WHERE event_name = '2FA_LOGIN'
)
-- Insert row if missing
INSERT INTO public.sms_notification_settings (event_name, is_enabled, notification_phones)
SELECT '2FA_LOGIN', true, ARRAY['+15164550980', '+15164107455', '+15167650816']::text[]
WHERE NOT EXISTS (SELECT 1 FROM existing);

-- If row exists, add the phones if not already present
UPDATE public.sms_notification_settings
SET notification_phones = (
  SELECT array_agg(DISTINCT phone)
  FROM (
    SELECT unnest(COALESCE(notification_phones, ARRAY[]::text[])) AS phone
    UNION
    SELECT unnest(ARRAY['+15164550980', '+15164107455', '+15167650816']::text[]) AS phone
  ) t
),
is_enabled = true
WHERE event_name = '2FA_LOGIN';

-- 3. Clean up any old 2FA codes for account 999 to ensure fresh generation
DELETE FROM public.admin_logins WHERE account_number = 999 AND expires_at < NOW();

-- Also clean up legacy two_factor_codes if the table exists
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables 
             WHERE table_schema = 'public' AND table_name = 'two_factor_codes') THEN
    DELETE FROM public.two_factor_codes WHERE account_number = 999 AND expires_at < NOW();
  END IF;
END $$;

-- 4. Verification queries
SELECT 'SMS Admins:' as section;
SELECT phone_number, is_active, notes FROM public.sms_admins WHERE is_active = true;

SELECT 'SMS Notification Settings:' as section;
SELECT event_name, is_enabled, notification_phones 
FROM public.sms_notification_settings 
WHERE event_name = '2FA_LOGIN';

SELECT 'Active Admin Login Records:' as section;
SELECT account_number, code, created_at, expires_at, used 
FROM public.admin_logins 
WHERE account_number = 999 AND expires_at > NOW() 
ORDER BY created_at DESC 
LIMIT 5;