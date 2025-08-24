-- Verification script for 2FA system setup
-- This will show the current state of all 2FA-related tables and configurations

\echo 'Checking SMS Admins table...'
SELECT 'SMS_ADMINS' as table_name, count(*) as total_records FROM public.sms_admins;
SELECT phone_number, is_active, notes, created_at 
FROM public.sms_admins 
ORDER BY created_at DESC;

\echo ''
\echo 'Checking SMS Notification Settings...'
SELECT 'SMS_NOTIFICATION_SETTINGS' as table_name, count(*) as total_records FROM public.sms_notification_settings;
SELECT event_name, is_enabled, notification_phones, created_at
FROM public.sms_notification_settings 
WHERE event_name = '2FA_LOGIN'
ORDER BY created_at DESC;

\echo ''
\echo 'Checking Admin Logins table...'
SELECT 'ADMIN_LOGINS' as table_name, count(*) as total_records FROM public.admin_logins;
SELECT account_number, code, created_at, expires_at, used, ip_address
FROM public.admin_logins 
WHERE account_number = 999 
ORDER BY created_at DESC 
LIMIT 10;

\echo ''
\echo 'Checking Two Factor Codes table (if exists)...'
SELECT 'TWO_FACTOR_CODES' as table_name, count(*) as total_records 
FROM public.two_factor_codes 
WHERE EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'two_factor_codes');

\echo ''
\echo 'Checking available 2FA functions...'
SELECT routine_name, routine_type
FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_name LIKE '%2fa%' OR routine_name LIKE '%admin_login%'
ORDER BY routine_name;