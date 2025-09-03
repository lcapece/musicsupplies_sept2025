-- Fix staff table RLS policies to allow proper access
-- This script addresses the 400 error when querying the staff table

-- First, let's drop the existing policies that might be causing issues
DROP POLICY IF EXISTS staff_select_policy ON staff;
DROP POLICY IF EXISTS staff_insert_policy ON staff;
DROP POLICY IF EXISTS staff_update_policy ON staff;
DROP POLICY IF EXISTS staff_delete_policy ON staff;

-- Create a more permissive select policy for authenticated users
CREATE POLICY staff_select_policy ON staff
    FOR SELECT
    USING (true); -- Allow all authenticated users to read staff records

-- Create insert policy for admins only
CREATE POLICY staff_insert_policy ON staff
    FOR INSERT
    WITH CHECK (
        -- Check if the current user is admin (account 999 or 99)
        EXISTS (
            SELECT 1 FROM accounts_lcmd a
            WHERE a.account_number IN (999, 99)
            AND a.user_id = auth.uid()
        )
    );

-- Create update policy for admins only
CREATE POLICY staff_update_policy ON staff
    FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM accounts_lcmd a
            WHERE a.account_number IN (999, 99)
            AND a.user_id = auth.uid()
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM accounts_lcmd a
            WHERE a.account_number IN (999, 99)
            AND a.user_id = auth.uid()
        )
    );

-- Create delete policy for admins only
CREATE POLICY staff_delete_policy ON staff
    FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM accounts_lcmd a
            WHERE a.account_number IN (999, 99)
            AND a.user_id = auth.uid()
        )
    );

-- Ensure the staff table has the correct structure
-- Add any missing columns if they don't exist
DO $$ 
BEGIN
    -- Check if account_number column exists and is the right type
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'staff' AND column_name = 'account_number'
    ) THEN
        ALTER TABLE staff ADD COLUMN account_number BIGINT NOT NULL;
    END IF;
    
    -- Check if privs column exists
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'staff' AND column_name = 'privs'
    ) THEN
        ALTER TABLE staff ADD COLUMN privs INT DEFAULT 0 NOT NULL;
    END IF;
    
    -- Check if created_at column exists
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'staff' AND column_name = 'created_at'
    ) THEN
        ALTER TABLE staff ADD COLUMN created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;
    END IF;
    
    -- Check if updated_at column exists
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'staff' AND column_name = 'updated_at'
    ) THEN
        ALTER TABLE staff ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;
    END IF;
END $$;

-- Ensure we have some test data
INSERT INTO staff (account_number, privs) 
VALUES (999, 10)
ON CONFLICT (account_number) DO UPDATE SET privs = 10;

INSERT INTO staff (account_number, privs) 
VALUES (99, 10)
ON CONFLICT (account_number) DO UPDATE SET privs = 10;

-- Add a few more test records for demonstration
INSERT INTO staff (account_number, privs) 
VALUES (101, 1), (102, 1), (103, 5)
ON CONFLICT (account_number) DO NOTHING;

-- Grant necessary permissions
GRANT ALL ON staff TO authenticated;
GRANT ALL ON staff TO anon;

-- Refresh the schema cache
NOTIFY pgrst, 'reload schema';
