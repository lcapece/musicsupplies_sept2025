-- CRITICAL PRODUCTION ISSUE INVESTIGATION
-- $1.2M Loss - Authentication System Failure
-- Date: 2025-08-13
-- ========================================

-- PART 1: IDENTIFY ALL PASSWORD/AUTH RELATED TABLES
-- ==================================================
SELECT '=== PART 1: ALL AUTH-RELATED TABLES ===' as investigation_step;

SELECT table_name, 
       (SELECT COUNT(*) FROM information_schema.columns 
        WHERE c.table_name = t.table_name 
        AND c.table_schema = 'public') as column_count
FROM information_schema.tables t
WHERE table_schema = 'public'
AND (
    table_name LIKE '%password%' OR
    table_name LIKE '%auth%' OR
    table_name LIKE '%user%' OR
    table_name LIKE '%account%' OR
    table_name LIKE '%login%'
)
ORDER BY table_name;

-- PART 2: CHECK EACH POTENTIAL PASSWORD TABLE
-- ============================================
SELECT '=== PART 2: USER_PASSWORDS TABLE STATUS ===' as investigation_step;

-- Does user_passwords exist and have data?
SELECT 
    COUNT(*) as total_records,
    COUNT(password_hash) as passwords_stored,
    COUNT(DISTINCT account_number) as unique_accounts,
    MIN(created_at) as oldest_password,
    MAX(updated_at) as newest_password
FROM user_passwords;

-- Sample of user_passwords data
SELECT 
    account_number,
    LENGTH(password_hash) as pwd_length,
    LEFT(password_hash, 10) as pwd_preview,
    created_at,
    updated_at
FROM user_passwords
ORDER BY updated_at DESC
LIMIT 10;

-- PART 3: CHECK ACCOUNTS TABLE FOR PASSWORDS
-- ===========================================
SELECT '=== PART 3: ACCOUNTS_LCMD PASSWORD FIELDS ===' as investigation_step;

-- Check if accounts_lcmd has password data
SELECT 
    COUNT(*) as total_accounts,
    COUNT(password) as passwords_in_accounts,
    COUNT(CASE WHEN password IS NOT NULL AND password != '' THEN 1 END) as non_empty_passwords
FROM accounts_lcmd;

-- Sample of accounts with passwords
SELECT 
    account_number,
    acct_name,
    CASE WHEN password IS NOT NULL THEN 'HAS_PASSWORD' ELSE 'NO_PASSWORD' END as pwd_status,
    requires_password_change,
    LENGTH(password) as pwd_length
FROM accounts_lcmd
WHERE account_number IN (99, 101, 999, 1, 2, 3, 100, 115)
ORDER BY account_number;

-- PART 4: FIND ALL AUTHENTICATION FUNCTIONS
-- =========================================
SELECT '=== PART 4: ALL AUTH FUNCTIONS ===' as investigation_step;

SELECT 
    routine_name,
    routine_type,
    created,
    last_altered
FROM information_schema.routines
WHERE routine_schema = 'public'
AND (
    routine_name LIKE '%auth%' OR
    routine_name LIKE '%login%' OR
    routine_name LIKE '%password%'
)
ORDER BY last_altered DESC;

-- PART 5: CHECK RECENT LOGIN ACTIVITY
-- ====================================
SELECT '=== PART 5: RECENT SUCCESSFUL LOGINS ===' as investigation_step;

-- Last 20 successful logins
SELECT 
    account_number,
    identifier_used,
    login_timestamp,
    ip_address
FROM login_activity_log
WHERE login_success = true
ORDER BY login_timestamp DESC
LIMIT 20;

-- Count of successful logins by day
SELECT 
    DATE(login_timestamp) as login_date,
    COUNT(*) as successful_logins,
    COUNT(DISTINCT account_number) as unique_accounts
FROM login_activity_log
WHERE login_success = true
AND login_timestamp > NOW() - INTERVAL '30 days'
GROUP BY DATE(login_timestamp)
ORDER BY login_date DESC;

-- PART 6: CHECK PASSWORD RESET ACTIVITY
-- =====================================
SELECT '=== PART 6: PASSWORD RESET ACTIVITY ===' as investigation_step;

-- Recent password resets
SELECT 
    COUNT(*) as total_resets_30d,
    COUNT(DISTINCT account_number) as unique_accounts_reset
FROM password_reset_tokens
WHERE created_at > NOW() - INTERVAL '30 days';

-- PART 7: ANALYZE AUTH FUNCTION SOURCE CODE
-- =========================================
SELECT '=== PART 7: CURRENT AUTH FUNCTION DEFINITION ===' as investigation_step;

-- Get the actual function definition for authenticate_user_v5
SELECT 
    routine_name,
    routine_definition
FROM information_schema.routines
WHERE routine_schema = 'public'
AND routine_name = 'authenticate_user_v5';

-- PART 8: CHECK FOR BACKUP OR HISTORY TABLES
-- ===========================================
SELECT '=== PART 8: POSSIBLE BACKUP TABLES ===' as investigation_step;

SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
AND (
    table_name LIKE '%backup%' OR
    table_name LIKE '%history%' OR
    table_name LIKE '%archive%' OR
    table_name LIKE '%old%' OR
    table_name LIKE '%temp%'
)
ORDER BY table_name;

-- PART 9: CHECK MIGRATION HISTORY
-- ================================
SELECT '=== PART 9: SUPABASE MIGRATION STATUS ===' as investigation_step;

-- Check schema_migrations to see what was applied
SELECT name, executed_at
FROM supabase_migrations.schema_migrations
WHERE name LIKE '%password%' OR name LIKE '%auth%'
ORDER BY executed_at DESC
LIMIT 20;

-- PART 10: TEST AUTHENTICATION WITH KNOWN ACCOUNTS
-- ================================================
SELECT '=== PART 10: TEST AUTHENTICATION ===' as investigation_step;

-- Test if functions exist and work
SELECT 'Testing authenticate_user_v5:' as test;
SELECT EXISTS(
    SELECT 1 FROM information_schema.routines 
    WHERE routine_name = 'authenticate_user_v5'
) as v5_exists;

SELECT 'Testing authenticate_user_lcmd:' as test;
SELECT EXISTS(
    SELECT 1 FROM information_schema.routines 
    WHERE routine_name = 'authenticate_user_lcmd'
) as lcmd_exists;

-- END OF INVESTIGATION
SELECT '=== INVESTIGATION COMPLETE - REVIEW RESULTS ABOVE ===' as status;