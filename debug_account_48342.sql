-- URGENT: Debug script for account 48342 login issue
-- Run this in Supabase SQL Editor to diagnose the problem

-- Step 1: Check if account 48342 exists in accounts_lcmd
SELECT 
    'Account Check' as step,
    account_number,
    acct_name,
    zip,
    email_address,
    phone
FROM accounts_lcmd 
WHERE account_number = 48342;

-- Step 2: Check if password record exists in user_passwords
SELECT 
    'Password Record Check' as step,
    account_number,
    LENGTH(password_hash) as hash_length,
    created_at,
    updated_at
FROM user_passwords 
WHERE account_number = 48342;

-- Step 3: Test password verification with the exact password "Tueday321"
SELECT 
    'Password Test' as step,
    account_number,
    verify_password('Tueday321', password_hash) as password_matches
FROM user_passwords 
WHERE account_number = 48342;

-- Step 4: Check what the authenticate function returns for this account
SELECT authenticate_user_lcmd(48342, 'Tueday321') as auth_result;

-- Step 5: Also test with email if available
WITH account_info AS (
    SELECT email_address 
    FROM accounts_lcmd 
    WHERE account_number = 48342 
    AND email_address IS NOT NULL
)
SELECT 
    'Email Auth Test' as step,
    authenticate_user_lcmd(ai.email_address, 'Tueday321') as auth_result
FROM account_info ai;

-- Step 6: Check for any login activity
SELECT 
    'Login Activity' as step,
    account_number,
    identifier_used,
    success,
    error_message,
    created_at
FROM login_activity_log 
WHERE account_number = 48342 
ORDER BY created_at DESC 
LIMIT 5;

-- Step 7: Check if there are any conflicting password records
SELECT 
    'All Password Records' as step,
    COUNT(*) as record_count
FROM user_passwords 
WHERE account_number = 48342;

-- Step 8: Check the hash_password function is working
SELECT 
    'Hash Function Test' as step,
    hash_password('Tueday321') as new_hash,
    LENGTH(hash_password('Tueday321')) as hash_length;