-- Create account 99 for products manager access
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
) ON CONFLICT (account_number) DO NOTHING;

-- Set account 99 password in logon_lcmd table
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
) ON CONFLICT (account_number) DO UPDATE SET
    password = EXCLUDED.password,
    requires_password_change = EXCLUDED.requires_password_change,
    updated_at = NOW();