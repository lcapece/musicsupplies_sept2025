-- Check what authenticate_user_v5 is actually doing

-- 1. Verify account 101 exists in accounts_lcmd
SELECT 'Account 101 in accounts_lcmd:' as check_type,
       account_number, acct_name, zip, email_address
FROM accounts_lcmd 
WHERE account_number = 101;

-- 2. Verify password exists in user_passwords
SELECT 'Account 101 in user_passwords:' as check_type,
       account_number, password_hash 
FROM user_passwords 
WHERE account_number = 101;

-- 3. Test the authentication function directly
SELECT 'Testing authenticate_user_v5:' as check_type;
SELECT * FROM authenticate_user_v5('101', 'Music123');

-- 4. If function doesn't exist or is wrong, let's check what functions we have
SELECT routine_name, routine_type 
FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_name LIKE 'authenticate%'
ORDER BY routine_name;