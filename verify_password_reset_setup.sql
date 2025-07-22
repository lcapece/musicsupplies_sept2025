-- Verify password_reset_tokens table exists
SELECT EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'password_reset_tokens'
) as table_exists;

-- Check if accounts_lcmd table has email_address column
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'accounts_lcmd' 
AND column_name = 'email_address';

-- Verify a test account exists
SELECT account_number, acct_name, email_address 
FROM accounts_lcmd 
WHERE account_number = 105;

-- Check password_reset_tokens table structure
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' 
AND table_name = 'password_reset_tokens'
ORDER BY ordinal_position;
