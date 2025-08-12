-- Create Employees table
-- Migration: 20250812_create_employees_table.sql
-- Description: Creates the employees table with empid, lastname, firstname, phone, pwd, and last_updated fields

CREATE TABLE IF NOT EXISTS employees (
    empid SERIAL PRIMARY KEY,
    lastname VARCHAR(100) NOT NULL,
    firstname VARCHAR(100) NOT NULL,
    phone VARCHAR(20),
    pwd VARCHAR(255) NOT NULL,
    last_updated TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create index on lastname, firstname for faster lookups
CREATE INDEX IF NOT EXISTS idx_employees_name ON employees (lastname, firstname);

-- Create index on phone for lookups
CREATE INDEX IF NOT EXISTS idx_employees_phone ON employees (phone);

-- Add trigger to automatically update last_updated field
CREATE OR REPLACE FUNCTION update_employees_last_updated()
RETURNS TRIGGER AS $$
BEGIN
    NEW.last_updated = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER trigger_employees_last_updated
    BEFORE UPDATE ON employees
    FOR EACH ROW
    EXECUTE FUNCTION update_employees_last_updated();

-- Add Row Level Security (RLS)
ALTER TABLE employees ENABLE ROW LEVEL SECURITY;

-- Create RLS policies (adjust as needed for your security requirements)
-- Policy to allow authenticated users to read all employees
CREATE POLICY employees_select_policy ON employees
    FOR SELECT
    USING (auth.role() = 'authenticated');

-- Policy to allow authenticated users to insert employees
CREATE POLICY employees_insert_policy ON employees
    FOR INSERT
    WITH CHECK (auth.role() = 'authenticated');

-- Policy to allow authenticated users to update employees
CREATE POLICY employees_update_policy ON employees
    FOR UPDATE
    USING (auth.role() = 'authenticated')
    WITH CHECK (auth.role() = 'authenticated');

-- Policy to allow authenticated users to delete employees
CREATE POLICY employees_delete_policy ON employees
    FOR DELETE
    USING (auth.role() = 'authenticated');

-- Add comment to document the table
COMMENT ON TABLE employees IS 'Employee information table with automatic last_updated tracking';
COMMENT ON COLUMN employees.empid IS 'Auto-incrementing employee ID (Primary Key)';
COMMENT ON COLUMN employees.lastname IS 'Employee last name';
COMMENT ON COLUMN employees.firstname IS 'Employee first name';
COMMENT ON COLUMN employees.phone IS 'Employee phone number';
COMMENT ON COLUMN employees.pwd IS 'Employee password (should be hashed)';
COMMENT ON COLUMN employees.last_updated IS 'Timestamp of last record update (auto-managed)';