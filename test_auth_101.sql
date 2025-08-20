-- Test authentication for account 101
-- First check current state
SELECT 'Account 101 details:' as info;
SELECT account_number, acct_name, zip FROM accounts_lcmd WHERE account_number = 101;

SELECT 'User passwords count for 101:' as info;
SELECT COUNT(*) as count FROM user_passwords WHERE account_number = 101;

-- Test with calculated ZIP code password
SELECT 'Testing with calculated password:' as info;
WITH account_info AS (
  SELECT acct_name, zip FROM accounts_lcmd WHERE account_number = 101
)
SELECT 
  LOWER(SUBSTRING(acct_name FROM 1 FOR 1) || SUBSTRING(zip FROM 1 FOR 5)) as calculated_password
FROM account_info;

-- Test authentication
SELECT 'Testing authentication:' as info;
SELECT * FROM authenticate_user('101', '11803', '127.0.0.1', null);