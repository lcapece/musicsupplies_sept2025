-- Add mobile_phone column to accounts_lcmd table
ALTER TABLE accounts_lcmd ADD COLUMN IF NOT EXISTS mobile_phone VARCHAR(50);

-- Add comment to the column
COMMENT ON COLUMN accounts_lcmd.mobile_phone IS 'Mobile phone number for the account';
