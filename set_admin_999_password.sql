-- Set password for admin account 999
-- This makes account 999 use the same authentication system as all other accounts
-- Password: 2750grove

-- First, ensure account 999 exists in accounts_lcmd
INSERT INTO accounts_lcmd (account_number, acct_name, status, credit_status)
VALUES (999, 'Admin Account', 'A', 'A')
ON CONFLICT (account_number) DO NOTHING;

-- Now set the password for account 999
-- Using the same password hashing function as other accounts
INSERT INTO user_passwords (account_number, password_hash, created_at, updated_at)
VALUES (
    999,
    crypt('2750grove', gen_salt('bf')),
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
)
ON CONFLICT (account_number) 
DO UPDATE SET 
    password_hash = crypt('2750grove', gen_salt('bf')),
    updated_at = CURRENT_TIMESTAMP;

-- Verify the password was set correctly
SELECT 
    account_number,
    CASE 
        WHEN password_hash = crypt('2750grove', password_hash) 
        THEN 'Password set successfully ✓'
        ELSE 'Password set failed ✗'
    END as status,
    created_at,
    updated_at
FROM user_passwords 
WHERE account_number = 999;

-- Grant any special permissions if needed
-- This ensures account 999 can access admin functions
INSERT INTO staff (account_number, privs, acct_name, master_pin)
VALUES (999, 5, 'Admin Account', '0000')
ON CONFLICT (account_number) 
DO UPDATE SET 
    privs = 5,
    updated_at = CURRENT_TIMESTAMP;