-- Update password for account 101 to 'music123'
UPDATE accounts_lcmd 
SET 
  password = 'music123',
  requires_password_change = false,
  is_dirty = true,
  updated_at = NOW()
WHERE account_number = 101;

-- Verify the update
SELECT 
  account_number,
  acct_name,
  password,
  requires_password_change
FROM accounts_lcmd
WHERE account_number = 101;