-- EMERGENCY: Investigate missing passwords

-- 1. Check ALL tables that might contain passwords
SELECT 'Checking user_passwords table:' as investigation;
SELECT COUNT(*) as total_records, 
       COUNT(password_hash) as passwords_present,
       MIN(created_at) as oldest_record,
       MAX(updated_at) as newest_record
FROM user_passwords;

-- Show sample of what's in user_passwords
SELECT account_number, 
       CASE WHEN password_hash IS NOT NULL THEN 'HAS PASSWORD' ELSE 'NO PASSWORD' END as status,
       created_at,
       updated_at
FROM user_passwords
ORDER BY updated_at DESC
LIMIT 20;

-- 2. Check if passwords might be in accounts_lcmd table
SELECT 'Checking accounts_lcmd table:' as investigation;
SELECT COUNT(*) as total_accounts,
       COUNT(password) as passwords_in_accounts_lcmd
FROM accounts_lcmd;

-- 3. Look for any other password-related tables
SELECT 'Looking for password-related tables:' as investigation;
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND (table_name LIKE '%password%' 
     OR table_name LIKE '%auth%' 
     OR table_name LIKE '%user%'
     OR table_name LIKE '%login%')
ORDER BY table_name;

-- 4. Check login activity to see who has been logging in
SELECT 'Recent login activity:' as investigation;
SELECT account_number, 
       login_success,
       login_timestamp,
       identifier_used
FROM login_activity_log
WHERE login_success = true
AND login_timestamp > NOW() - INTERVAL '7 days'
ORDER BY login_timestamp DESC
LIMIT 20;

-- 5. Check if there's a password_reset_tokens table with recent activity
SELECT 'Password reset activity:' as investigation;
SELECT COUNT(*) as total_resets,
       MAX(created_at) as most_recent_reset
FROM password_reset_tokens
WHERE created_at > NOW() - INTERVAL '7 days';

-- 6. Check the actual authentication functions
SELECT 'Authentication functions in database:' as investigation;
SELECT routine_name, created, last_altered
FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND (routine_name LIKE '%auth%' OR routine_name LIKE '%password%')
ORDER BY last_altered DESC;

-- 7. CRITICAL: Check if user_passwords data might have been deleted
SELECT 'Checking for deleted records (if soft delete exists):' as investigation;
SELECT column_name 
FROM information_schema.columns 
WHERE table_name = 'user_passwords' 
AND table_schema = 'public'
ORDER BY ordinal_position;