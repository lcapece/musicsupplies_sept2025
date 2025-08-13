-- URGENT: Rollback any changes to accounts_lcmd table for account 101
-- The accounts_lcmd table should NOT store passwords

-- Reset the password field to NULL or empty if it was modified
UPDATE accounts_lcmd 
SET 
  password = NULL,  -- Clear any password that shouldn't be there
  is_dirty = false,
  updated_at = updated_at  -- Keep original timestamp
WHERE account_number = 101 
  AND password IS NOT NULL;

-- Verify the accounts_lcmd table has no password for account 101
SELECT 
  account_number,
  acct_name,
  password,
  is_dirty,
  updated_at
FROM accounts_lcmd
WHERE account_number = 101;

-- Show that passwords are properly stored in user_passwords table
SELECT 
  account_number,
  password_hash,
  created_at,
  updated_at
FROM user_passwords
WHERE account_number = 101;