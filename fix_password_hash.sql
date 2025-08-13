-- EMERGENCY FIX: Set password with proper format for account 101

-- Check current authentication function to understand format
SELECT authenticate_user_lcmd(101, 'music123') as test_lowercase;
SELECT authenticate_user_lcmd(101, 'Music123') as test_capital;

-- Update password directly (the auth function expects plain text comparison)
DELETE FROM user_passwords WHERE account_number = 101;

INSERT INTO user_passwords (account_number, password_hash, created_at, updated_at)
VALUES (101, 'Music123', NOW(), NOW())
ON CONFLICT (account_number) 
DO UPDATE SET 
  password_hash = 'Music123',
  updated_at = NOW();

-- Verify the password is set
SELECT account_number, password_hash FROM user_passwords WHERE account_number = 101;

-- Test authentication
SELECT authenticate_user_lcmd(101, 'Music123') as auth_result;