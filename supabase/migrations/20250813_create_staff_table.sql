-- Create Staff table for managing sales staff and administrators
-- Migration: 20250813_create_staff_table.sql
-- Description: Creates the staff table with account_number and privs fields for role-based access control

CREATE TABLE IF NOT EXISTS staff (
    id SERIAL PRIMARY KEY,
    account_number BIGINT NOT NULL UNIQUE,
    privs INT DEFAULT 0 NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_staff_account 
        FOREIGN KEY (account_number) 
        REFERENCES accounts_lcmd(account_number) 
        ON DELETE CASCADE
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_staff_account_number ON staff (account_number);
CREATE INDEX IF NOT EXISTS idx_staff_privs ON staff (privs);

-- Add trigger to automatically update updated_at field
CREATE OR REPLACE FUNCTION update_staff_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER trigger_staff_updated_at
    BEFORE UPDATE ON staff
    FOR EACH ROW
    EXECUTE FUNCTION update_staff_updated_at();

-- Add Row Level Security (RLS)
ALTER TABLE staff ENABLE ROW LEVEL SECURITY;

-- Policy to allow authenticated users to read staff records
CREATE POLICY staff_select_policy ON staff
    FOR SELECT
    USING (auth.role() = 'authenticated');

-- Policy to allow only admins (account 999 or special admin) to modify staff records
CREATE POLICY staff_insert_policy ON staff
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM accounts_lcmd 
            WHERE account_number = 999 
            AND auth.uid() = user_id
        )
        OR
        EXISTS (
            SELECT 1 FROM accounts_lcmd 
            WHERE account_number = 99 
            AND auth.uid() = user_id
        )
    );

CREATE POLICY staff_update_policy ON staff
    FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM accounts_lcmd 
            WHERE account_number = 999 
            AND auth.uid() = user_id
        )
        OR
        EXISTS (
            SELECT 1 FROM accounts_lcmd 
            WHERE account_number = 99 
            AND auth.uid() = user_id
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM accounts_lcmd 
            WHERE account_number = 999 
            AND auth.uid() = user_id
        )
        OR
        EXISTS (
            SELECT 1 FROM accounts_lcmd 
            WHERE account_number = 99 
            AND auth.uid() = user_id
        )
    );

CREATE POLICY staff_delete_policy ON staff
    FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM accounts_lcmd 
            WHERE account_number = 999 
            AND auth.uid() = user_id
        )
        OR
        EXISTS (
            SELECT 1 FROM accounts_lcmd 
            WHERE account_number = 99 
            AND auth.uid() = user_id
        )
    );

-- Add comments to document the table
COMMENT ON TABLE staff IS 'Staff table for managing sales staff and administrators with role-based privileges';
COMMENT ON COLUMN staff.account_number IS 'Reference to account number in accounts_lcmd table';
COMMENT ON COLUMN staff.privs IS 'Privilege level: 0=no privileges, 1=sales staff, 5+=administrator';
COMMENT ON COLUMN staff.created_at IS 'Timestamp when the staff record was created';
COMMENT ON COLUMN staff.updated_at IS 'Timestamp of last record update (auto-managed)';

-- Insert initial admin records
-- Account 999 is the main admin, give them level 10 privileges
INSERT INTO staff (account_number, privs) 
VALUES (999, 10)
ON CONFLICT (account_number) DO NOTHING;

-- Account 99 is the special admin, give them level 10 privileges
INSERT INTO staff (account_number, privs) 
VALUES (99, 10)
ON CONFLICT (account_number) DO NOTHING;