-- DIAGNOSTIC SCRIPT: Debug Contact Info Saving Issue
-- Run this in Supabase SQL Editor to identify the exact problem

-- 1. Check if the contactinfo table exists
SELECT 
    '1. Table Exists' as test,
    EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_name = 'contactinfo'
    ) as result;

-- 2. Check table structure
SELECT 
    '2. Table Structure' as test,
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'contactinfo'
ORDER BY ordinal_position;

-- 3. Check if functions exist
SELECT 
    '3. Functions Exist' as test,
    routine_name,
    routine_type
FROM information_schema.routines
WHERE routine_name IN ('upsert_contact_info', 'get_contact_info')
ORDER BY routine_name;

-- 4. Check RLS policies
SELECT 
    '4. RLS Policies' as test,
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies
WHERE tablename = 'contactinfo';

-- 5. Check current user permissions
SELECT 
    '5. User Permissions' as test,
    grantee,
    privilege_type
FROM information_schema.table_privileges
WHERE table_name = 'contactinfo';

-- 6. Test the upsert function directly with a sample account
DO $$
DECLARE
    test_result RECORD;
    error_msg TEXT;
    error_detail TEXT;
    error_hint TEXT;
BEGIN
    BEGIN
        -- Try to insert/update a test record
        SELECT * INTO test_result FROM upsert_contact_info(
            88888,  -- test account number
            'test@test.com',
            '555-1111',
            '555-2222'
        );
        RAISE NOTICE 'UPSERT SUCCESS: %', test_result;
        
        -- Clean up
        DELETE FROM contactinfo WHERE account_number = 88888;
        RAISE NOTICE 'Cleanup complete';
    EXCEPTION
        WHEN OTHERS THEN
            GET STACKED DIAGNOSTICS 
                error_msg = MESSAGE_TEXT,
                error_detail = PG_EXCEPTION_DETAIL,
                error_hint = PG_EXCEPTION_HINT;
            RAISE NOTICE 'UPSERT ERROR: % - Detail: % - Hint: %', error_msg, error_detail, error_hint;
    END;
END $$;

-- 7. Check if there are any existing records
SELECT 
    '7. Existing Records' as test,
    COUNT(*) as record_count
FROM contactinfo;

-- 8. Check function permissions specifically
SELECT 
    '8. Function Permissions' as test,
    proname as function_name,
    proowner::regrole as owner,
    proacl as access_list
FROM pg_proc
WHERE proname IN ('upsert_contact_info', 'get_contact_info');

-- 9. Check if authenticated role exists and has proper permissions
SELECT 
    '9. Role Check' as test,
    rolname,
    rolsuper,
    rolinherit,
    rolcreaterole,
    rolcreatedb
FROM pg_roles
WHERE rolname IN ('authenticated', 'anon', 'service_role');