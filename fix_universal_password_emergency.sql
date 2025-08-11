-- EMERGENCY UNIVERSAL PASSWORD FIX - Music123
-- This script restores the universal master password system

-- Ensure the pwd table exists and has the correct structure
CREATE TABLE IF NOT EXISTS pwd (
    id INTEGER PRIMARY KEY DEFAULT 1,
    pwd TEXT NOT NULL
);

-- Set the universal master password to Music123
INSERT INTO pwd (id, pwd) VALUES (1, 'Music123') 
ON CONFLICT (id) DO UPDATE SET pwd = 'Music123';

-- Verify the pwd table has the correct entry
SELECT 'PWD Table Check:' as check_name, pwd FROM pwd WHERE id = 1;

-- Check that Account 999 exists in accounts_lcmd (it should be hardcoded in AuthContext)
INSERT INTO accounts_lcmd (
    account_number, 
    acct_name, 
    address, 
    city, 
    state, 
    zip, 
    email_address, 
    phone, 
    mobile_phone, 
    requires_password_change, 
    is_special_admin
) VALUES (
    999, 
    'Demo Account', 
    'N/A', 
    'N/A', 
    'N/A', 
    'N/A', 
    'admin@musicsupplies.com', 
    'N/A', 
    'N/A', 
    false, 
    true
) ON CONFLICT (account_number) DO UPDATE SET
    is_special_admin = true,
    requires_password_change = false;

-- Ensure the authenticate_user_v5 function exists and works properly
-- (This should already be deployed, but let's make sure account 999 is handled)
SELECT 'Account 999 Check:' as check_name, account_number, acct_name, is_special_admin 
FROM accounts_lcmd WHERE account_number = 999;

-- Test a few key accounts exist
SELECT 'Account 101 Check:' as check_name, account_number, acct_name 
FROM accounts_lcmd WHERE account_number = 101 LIMIT 1;

SELECT 'Account 115 Check:' as check_name, account_number, acct_name 
FROM accounts_lcmd WHERE account_number = 115 LIMIT 1;

-- Final verification
SELECT 'MASTER PASSWORD VERIFICATION:' as final_check, pwd FROM pwd WHERE id = 1;
