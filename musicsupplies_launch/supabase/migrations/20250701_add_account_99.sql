/*
  # Add account 99 for SKU Import functionality
  
  This migration adds the special admin account (99) to the accounts_lcmd table
  and sets up the default password for it. This account will have access to the
  special SKU import functionality.
*/

-- Insert account 99 if it doesn't exist
INSERT INTO accounts_lcmd
  (account_number, password, acct_name, address, city, state, zip, email_address)
VALUES
  (99, 'sku_import_admin', 'SKU Import Admin', '123 Admin St', 'Admin City', 'NY', '10001', 'admin99@example.com')
ON CONFLICT (account_number) DO UPDATE
SET 
  password = 'sku_import_admin',
  acct_name = 'SKU Import Admin',
  zip = '10001';

-- Insert into logon_lcmd table to ensure the password is stored correctly
INSERT INTO logon_lcmd
  (account_number, password)
VALUES
  (99, 'sku_import_admin')
ON CONFLICT (account_number) DO UPDATE
SET password = 'sku_import_admin';

-- Update the accounts documentation to reflect the new test account
COMMENT ON TABLE accounts_lcmd IS 'Accounts table with test accounts: 
- Account 99: SKU Import Admin (password: sku_import_admin)
- Account 101: All Music (default password: a11803)
- Account 102: Music World Inc. (default password: m60601)
- Account 999: Administrator (password: admin123)';
