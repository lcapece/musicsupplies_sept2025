-- Create contactinfo table for account contact information
-- Migration: 20250812_create_contactinfo_table.sql
-- Description: Creates table to store one contact record per account with email, business phone, and mobile phone

CREATE TABLE IF NOT EXISTS contactinfo (
    account_number INTEGER PRIMARY KEY,
    email_address VARCHAR(255),
    business_phone VARCHAR(20),
    mobile_phone VARCHAR(20),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_contactinfo_account ON contactinfo (account_number);

-- Add trigger to automatically update updated_at field
CREATE OR REPLACE FUNCTION update_contactinfo_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE 'plpgsql';

CREATE TRIGGER trigger_contactinfo_updated_at
    BEFORE UPDATE ON contactinfo
    FOR EACH ROW
    EXECUTE FUNCTION update_contactinfo_updated_at();

-- Add Row Level Security (RLS)
ALTER TABLE contactinfo ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for authenticated users (backend access)
CREATE POLICY contactinfo_select_policy ON contactinfo
    FOR SELECT
    USING (auth.role() = 'authenticated');

CREATE POLICY contactinfo_insert_policy ON contactinfo
    FOR INSERT
    WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY contactinfo_update_policy ON contactinfo
    FOR UPDATE
    USING (auth.role() = 'authenticated')
    WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY contactinfo_delete_policy ON contactinfo
    FOR DELETE
    USING (auth.role() = 'authenticated');

-- Create upsert function for contact info (insert or update)
CREATE OR REPLACE FUNCTION upsert_contact_info(
    p_account_number INTEGER,
    p_email_address VARCHAR(255) DEFAULT NULL,
    p_business_phone VARCHAR(20) DEFAULT NULL,
    p_mobile_phone VARCHAR(20) DEFAULT NULL
)
RETURNS TABLE(account_number INTEGER, email_address VARCHAR(255), business_phone VARCHAR(20), mobile_phone VARCHAR(20), updated_at TIMESTAMP WITH TIME ZONE)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Insert or update contact info for the account
    INSERT INTO contactinfo (account_number, email_address, business_phone, mobile_phone)
    VALUES (p_account_number, p_email_address, p_business_phone, p_mobile_phone)
    ON CONFLICT (account_number) 
    DO UPDATE SET
        email_address = COALESCE(EXCLUDED.email_address, contactinfo.email_address),
        business_phone = COALESCE(EXCLUDED.business_phone, contactinfo.business_phone),
        mobile_phone = COALESCE(EXCLUDED.mobile_phone, contactinfo.mobile_phone),
        updated_at = CURRENT_TIMESTAMP;
    
    -- Return the updated record
    RETURN QUERY
    SELECT ci.account_number, ci.email_address, ci.business_phone, ci.mobile_phone, ci.updated_at
    FROM contactinfo ci
    WHERE ci.account_number = p_account_number;
END;
$$;

-- Create function to get contact info for an account
CREATE OR REPLACE FUNCTION get_contact_info(p_account_number INTEGER)
RETURNS TABLE(account_number INTEGER, email_address VARCHAR(255), business_phone VARCHAR(20), mobile_phone VARCHAR(20), updated_at TIMESTAMP WITH TIME ZONE)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT ci.account_number, ci.email_address, ci.business_phone, ci.mobile_phone, ci.updated_at
    FROM contactinfo ci
    WHERE ci.account_number = p_account_number;
    
    -- If no record exists, return a row with nulls
    IF NOT FOUND THEN
        RETURN QUERY
        SELECT p_account_number, NULL::VARCHAR(255), NULL::VARCHAR(20), NULL::VARCHAR(20), NULL::TIMESTAMP WITH TIME ZONE;
    END IF;
END;
$$;

-- Add table and column comments for documentation
COMMENT ON TABLE contactinfo IS 'Contact information for accounts - maximum one record per account';
COMMENT ON COLUMN contactinfo.account_number IS 'Account number (Primary Key) - references accounts_lcmd';
COMMENT ON COLUMN contactinfo.email_address IS 'Email address for the account';
COMMENT ON COLUMN contactinfo.business_phone IS 'Business phone number for the account';
COMMENT ON COLUMN contactinfo.mobile_phone IS 'Mobile phone number for the account';
COMMENT ON COLUMN contactinfo.created_at IS 'Timestamp when record was created';
COMMENT ON COLUMN contactinfo.updated_at IS 'Timestamp when record was last updated (auto-managed)';

-- Grant necessary permissions to authenticated users
GRANT SELECT, INSERT, UPDATE, DELETE ON contactinfo TO authenticated;
GRANT USAGE ON SCHEMA public TO authenticated;