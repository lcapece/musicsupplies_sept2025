-- Ensure admin account 999 exists in accounts_lcmd table
-- This account is needed for 2FA authentication to work

-- Check if account 999 exists, if not create it
INSERT INTO accounts_lcmd (
    account_number,
    acct_name,
    address,
    city,
    state,
    zip,
    phone,
    mobile_phone,
    email_address,
    user_id
)
VALUES (
    999,
    'Backend Admin',
    '2750 Grove Avenue',
    'Admin City',
    'NY',
    '11111',
    '516-410-7455',
    '516-410-7455',
    'admin@musicsupplies.com',
    NULL
)
ON CONFLICT (account_number) 
DO UPDATE SET 
    acct_name = 'Backend Admin',
    address = '2750 Grove Avenue',
    city = 'Admin City',
    state = 'NY',
    zip = '11111',
    phone = '516-410-7455',
    mobile_phone = '516-410-7455',
    email_address = 'admin@musicsupplies.com';

-- Verify account 999 exists
SELECT account_number, acct_name, email_address FROM accounts_lcmd WHERE account_number = 999;