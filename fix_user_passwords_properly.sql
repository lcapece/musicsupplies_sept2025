-- Fix user_passwords table for account 101 and 999

-- First, check what's currently in user_passwords
SELECT account_number, password_hash, created_at, updated_at 
FROM user_passwords 
WHERE account_number IN (101, 999)
ORDER BY account_number;

-- Ensure account 101 has password "Music123" (with capital M as requested)
INSERT INTO user_passwords (account_number, password_hash, created_at, updated_at)
VALUES (101, 'Music123', NOW(), NOW())
ON CONFLICT (account_number) 
DO UPDATE SET 
  password_hash = 'Music123',
  updated_at = NOW();

-- Ensure account 999 has backdoor password "music123" (all lowercase)
INSERT INTO user_passwords (account_number, password_hash, created_at, updated_at)
VALUES (999, 'music123', NOW(), NOW())
ON CONFLICT (account_number) 
DO UPDATE SET 
  password_hash = 'music123',
  updated_at = NOW();

-- Verify the updates
SELECT account_number, password_hash, updated_at 
FROM user_passwords 
WHERE account_number IN (101, 999)
ORDER BY account_number;

-- Test authentication for both accounts
SELECT authenticate_user_v5(101, 'Music123') as test_101;
SELECT authenticate_user_v5(999, 'music123') as test_999;