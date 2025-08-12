-- Run this script in your Supabase SQL Editor to create the Employees table
-- Copy and paste this entire script into the SQL Editor and click "Run"

BEGIN;

-- Create Employees table
CREATE TABLE IF NOT EXISTS employees (
    empid SERIAL PRIMARY KEY,
    lastname VARCHAR(100) NOT NULL,
    firstname VARCHAR(100) NOT NULL,
    phone VARCHAR(20),
    pwd VARCHAR(255) NOT NULL,
    last_updated TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_employees_name ON employees (lastname, firstname);
CREATE INDEX IF NOT EXISTS idx_employees_phone ON employees (phone);

-- Add trigger function to automatically update last_updated field
CREATE OR REPLACE FUNCTION update_employees_last_updated()
RETURNS TRIGGER AS $$
BEGIN
    NEW.last_updated = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE 'plpgsql';

-- Create trigger to call the function on UPDATE
CREATE TRIGGER trigger_employees_last_updated
    BEFORE UPDATE ON employees
    FOR EACH ROW
    EXECUTE FUNCTION update_employees_last_updated();

-- Enable Row Level Security (RLS)
ALTER TABLE employees ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for authenticated users
CREATE POLICY employees_select_policy ON employees
    FOR SELECT
    USING (auth.role() = 'authenticated');

CREATE POLICY employees_insert_policy ON employees
    FOR INSERT
    WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY employees_update_policy ON employees
    FOR UPDATE
    USING (auth.role() = 'authenticated')
    WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY employees_delete_policy ON employees
    FOR DELETE
    USING (auth.role() = 'authenticated');

-- Add table and column comments for documentation
COMMENT ON TABLE employees IS 'Employee information table with automatic last_updated tracking';
COMMENT ON COLUMN employees.empid IS 'Auto-incrementing employee ID (Primary Key)';
COMMENT ON COLUMN employees.lastname IS 'Employee last name';
COMMENT ON COLUMN employees.firstname IS 'Employee first name';
COMMENT ON COLUMN employees.phone IS 'Employee phone number';
COMMENT ON COLUMN employees.pwd IS 'Employee password (should be hashed before storage)';
COMMENT ON COLUMN employees.last_updated IS 'Timestamp of last record update (auto-managed by trigger)';

COMMIT;

-- Verification query - run this after the table is created
SELECT 
    table_name,
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'employees' 
ORDER BY ordinal_position;