-- Fix admin account 999 permissions for contact info management
-- Ensures admin can update contact info for any account

-- Drop existing function to recreate with proper permissions
DROP FUNCTION IF EXISTS upsert_contact_info(INTEGER, TEXT, TEXT, TEXT);

-- Recreate the upsert_contact_info function with proper admin support
CREATE OR REPLACE FUNCTION upsert_contact_info(
    p_account_number INTEGER,
    p_email_address TEXT DEFAULT NULL,
    p_business_phone TEXT DEFAULT NULL,
    p_mobile_phone TEXT DEFAULT NULL
)
RETURNS TABLE(
    account_number INTEGER,
    email_address TEXT,
    business_phone TEXT,
    mobile_phone TEXT,
    updated_at TIMESTAMP WITH TIME ZONE
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_current_account TEXT;
BEGIN
    -- Get the current account number from the session config
    v_current_account := current_setting('app.current_account_number', true);
    
    -- Allow admin account 999 to update any account
    -- Also allow accounts to update their own info
    IF v_current_account IS NULL OR 
       (v_current_account != '999' AND v_current_account::INTEGER != p_account_number) THEN
        -- For non-admin users, only allow updating their own account
        IF auth.uid() IS NOT NULL THEN
            -- Check if this is a valid authenticated user trying to update their own account
            IF NOT EXISTS (
                SELECT 1 FROM accounts_lcmd 
                WHERE account_number = p_account_number 
                AND user_id = auth.uid()
            ) THEN
                RAISE EXCEPTION 'Unauthorized: Cannot update contact info for account %', p_account_number;
            END IF;
        ELSE
            -- No auth user and not admin context
            RAISE EXCEPTION 'Unauthorized: Must be authenticated to update contact info';
        END IF;
    END IF;
    
    -- Update the contactinfo table
    INSERT INTO contactinfo (account_number, email_address, business_phone, mobile_phone)
    VALUES (p_account_number, p_email_address, p_business_phone, p_mobile_phone)
    ON CONFLICT (account_number) 
    DO UPDATE SET
        email_address = COALESCE(EXCLUDED.email_address, contactinfo.email_address),
        business_phone = COALESCE(EXCLUDED.business_phone, contactinfo.business_phone),
        mobile_phone = COALESCE(EXCLUDED.mobile_phone, contactinfo.mobile_phone),
        updated_at = CURRENT_TIMESTAMP;
    
    -- Also update the accounts_lcmd table with the same contact info
    UPDATE accounts_lcmd
    SET 
        email_address = COALESCE(p_email_address, accounts_lcmd.email_address),
        phone = COALESCE(p_business_phone, accounts_lcmd.phone),
        mobile_phone = COALESCE(p_mobile_phone, accounts_lcmd.mobile_phone)
    WHERE account_number = p_account_number;
    
    -- Return the updated record
    RETURN QUERY
    SELECT 
        ci.account_number, 
        ci.email_address, 
        ci.business_phone, 
        ci.mobile_phone, 
        ci.updated_at
    FROM contactinfo ci
    WHERE ci.account_number = p_account_number;
END;
$$;

-- Grant execute permission to all roles
GRANT EXECUTE ON FUNCTION upsert_contact_info(INTEGER, TEXT, TEXT, TEXT) TO anon;
GRANT EXECUTE ON FUNCTION upsert_contact_info(INTEGER, TEXT, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION upsert_contact_info(INTEGER, TEXT, TEXT, TEXT) TO service_role;

-- Also ensure get_contact_info works for admin
DROP FUNCTION IF EXISTS get_contact_info(INTEGER);

CREATE OR REPLACE FUNCTION get_contact_info(p_account_number INTEGER)
RETURNS TABLE(
    account_number INTEGER,
    email_address TEXT,
    business_phone TEXT,
    mobile_phone TEXT,
    updated_at TIMESTAMP WITH TIME ZONE
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_current_account TEXT;
BEGIN
    -- Get the current account number from the session config
    v_current_account := current_setting('app.current_account_number', true);
    
    -- Allow admin account 999 to read any account
    -- Also allow accounts to read their own info
    IF v_current_account IS NULL OR 
       (v_current_account != '999' AND v_current_account::INTEGER != p_account_number) THEN
        -- For non-admin users, only allow reading their own account
        IF auth.uid() IS NOT NULL THEN
            -- Check if this is a valid authenticated user trying to read their own account
            IF NOT EXISTS (
                SELECT 1 FROM accounts_lcmd 
                WHERE account_number = p_account_number 
                AND user_id = auth.uid()
            ) THEN
                RAISE EXCEPTION 'Unauthorized: Cannot read contact info for account %', p_account_number;
            END IF;
        END IF;
    END IF;
    
    -- First try to get from contactinfo table
    RETURN QUERY
    SELECT 
        ci.account_number, 
        ci.email_address, 
        ci.business_phone, 
        ci.mobile_phone, 
        ci.updated_at
    FROM contactinfo ci
    WHERE ci.account_number = p_account_number;
    
    -- If no record in contactinfo, get from accounts_lcmd
    IF NOT FOUND THEN
        RETURN QUERY
        SELECT 
            a.account_number,
            a.email_address::TEXT,
            a.phone::TEXT AS business_phone,
            a.mobile_phone::TEXT,
            NULL::TIMESTAMP WITH TIME ZONE AS updated_at
        FROM accounts_lcmd a
        WHERE a.account_number = p_account_number;
    END IF;
END;
$$;

-- Grant execute permission to all roles
GRANT EXECUTE ON FUNCTION get_contact_info(INTEGER) TO anon;
GRANT EXECUTE ON FUNCTION get_contact_info(INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION get_contact_info(INTEGER) TO service_role;

-- Update RLS policies for contactinfo table to allow admin access
DROP POLICY IF EXISTS contactinfo_select_policy ON contactinfo;
DROP POLICY IF EXISTS contactinfo_insert_policy ON contactinfo;
DROP POLICY IF EXISTS contactinfo_update_policy ON contactinfo;
DROP POLICY IF EXISTS contactinfo_delete_policy ON contactinfo;

-- Create new policies that allow admin (account 999) full access
CREATE POLICY contactinfo_select_policy ON contactinfo
    FOR SELECT
    USING (
        auth.role() = 'authenticated' OR
        current_setting('app.current_account_number', true) = '999'
    );

CREATE POLICY contactinfo_insert_policy ON contactinfo
    FOR INSERT
    WITH CHECK (
        auth.role() = 'authenticated' OR
        current_setting('app.current_account_number', true) = '999'
    );

CREATE POLICY contactinfo_update_policy ON contactinfo
    FOR UPDATE
    USING (
        auth.role() = 'authenticated' OR
        current_setting('app.current_account_number', true) = '999'
    )
    WITH CHECK (
        auth.role() = 'authenticated' OR
        current_setting('app.current_account_number', true) = '999'
    );

CREATE POLICY contactinfo_delete_policy ON contactinfo
    FOR DELETE
    USING (
        auth.role() = 'authenticated' OR
        current_setting('app.current_account_number', true) = '999'
    );

-- Also ensure accounts_lcmd table allows admin to update contact fields
-- Update existing RLS policies if needed
DROP POLICY IF EXISTS accounts_lcmd_admin_policy ON accounts_lcmd;

CREATE POLICY accounts_lcmd_admin_policy ON accounts_lcmd
    FOR ALL
    USING (
        current_setting('app.current_account_number', true) = '999'
    )
    WITH CHECK (
        current_setting('app.current_account_number', true) = '999'
    );