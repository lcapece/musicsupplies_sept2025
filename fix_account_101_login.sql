-- EMERGENCY FIX: Restore account 101 login with password 'music123'

-- First check if account 101 exists in user_passwords
SELECT 'Current state:' as status, account_number, password_hash 
FROM user_passwords 
WHERE account_number = 101;

-- Delete any existing entry for account 101
DELETE FROM user_passwords WHERE account_number = 101;

-- Insert fresh password entry for account 101
INSERT INTO user_passwords (account_number, password_hash, created_at, updated_at)
VALUES (101, 'music123', NOW(), NOW());

-- Verify the fix
SELECT 'After fix:' as status, account_number, password_hash 
FROM user_passwords 
WHERE account_number = 101;

-- Also ensure accounts_lcmd has no password field set
UPDATE accounts_lcmd 
SET password = NULL 
WHERE account_number = 101;

-- Test the authentication function
SELECT authenticate_user_lcmd(101, 'music123') as auth_result;