-- Debug authentication step by step
-- Check account 101 data
SELECT 'Account 101 basic info:' as step;
SELECT account_number, acct_name, zip, email_address FROM accounts_lcmd WHERE account_number = 101;

-- Check if account 101 has custom password
SELECT 'Account 101 in user_passwords:' as step;
SELECT account_number, created_at FROM user_passwords WHERE account_number = 101;

-- Calculate what the ZIP password should be
SELECT 'Calculated ZIP password:' as step;
SELECT 
  account_number,
  acct_name,
  zip,
  LOWER(SUBSTRING(acct_name FROM 1 FOR 1) || SUBSTRING(zip FROM 1 FOR 5)) as calculated_zip_password
FROM accounts_lcmd 
WHERE account_number = 101;

-- Test the actual function call
SELECT 'Testing authenticate_user function:' as step;
SELECT * FROM authenticate_user('101', '11803', '127.0.0.1', null);