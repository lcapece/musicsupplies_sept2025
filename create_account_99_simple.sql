-- Ensure account 99 exists with correct password
DELETE FROM logon_lcmd WHERE account_number = 99;
DELETE FROM accounts_lcmd WHERE account_number = 99;

-- Create account 99
INSERT INTO accounts_lcmd (
    account_number, 
    acct_name, 
    address, 
    city, 
    state, 
    zip, 
    phone,
    requires_password_change
) VALUES (
    99, 
    'Products Manager', 
    '123 Manager Street', 
    'Manager City', 
    'MN', 
    '99999',
    '555-PROD',
    false
);

-- Set account 99 password (plain text like admin)
INSERT INTO logon_lcmd (
    account_number,
    password,
    requires_password_change,
    created_at
) VALUES (
    99,
    'LindaHanlon',
    false,
    NOW()
);

-- Verify it was created
SELECT 'Account created:' as status, account_number, acct_name FROM accounts_lcmd WHERE account_number = 99;
SELECT 'Password set:' as status, account_number, password FROM logon_lcmd WHERE account_number = 99;