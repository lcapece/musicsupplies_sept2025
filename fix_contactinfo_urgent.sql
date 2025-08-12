-- URGENT FIX: Contact Info not saving properly
-- Problem: The upsert_contact_info function was using COALESCE incorrectly, preventing updates
-- This fix allows proper updating of contact information including clearing fields

-- Drop the broken function
DROP FUNCTION IF EXISTS upsert_contact_info(INTEGER, VARCHAR(255), VARCHAR(20), VARCHAR(20));

-- Create the FIXED upsert function
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
    -- IMPORTANT: Use EXCLUDED values directly, not COALESCE, to allow clearing fields
    INSERT INTO contactinfo (account_number, email_address, business_phone, mobile_phone)
    VALUES (p_account_number, p_email_address, p_business_phone, p_mobile_phone)
    ON CONFLICT (account_number) 
    DO UPDATE SET
        email_address = EXCLUDED.email_address,  -- Direct assignment allows NULL values
        business_phone = EXCLUDED.business_phone,  -- Direct assignment allows NULL values
        mobile_phone = EXCLUDED.mobile_phone,      -- Direct assignment allows NULL values
        updated_at = CURRENT_TIMESTAMP;
    
    -- Return the updated record
    RETURN QUERY
    SELECT ci.account_number, ci.email_address, ci.business_phone, ci.mobile_phone, ci.updated_at
    FROM contactinfo ci
    WHERE ci.account_number = p_account_number;
END;
$$;

-- Ensure execute permission is granted
GRANT EXECUTE ON FUNCTION upsert_contact_info(INTEGER, VARCHAR(255), VARCHAR(20), VARCHAR(20)) TO anon, authenticated;

-- Ensure the function is owned by postgres (important for SECURITY DEFINER)
ALTER FUNCTION upsert_contact_info(INTEGER, VARCHAR(255), VARCHAR(20), VARCHAR(20)) OWNER TO postgres;

-- Also ensure the get_contact_info function has proper permissions
GRANT EXECUTE ON FUNCTION get_contact_info(INTEGER) TO anon, authenticated;
ALTER FUNCTION get_contact_info(INTEGER) OWNER TO postgres;

-- Test the fix by creating/updating a test record
DO $$
DECLARE
    test_result RECORD;
BEGIN
    -- Test insert with all fields
    SELECT * INTO test_result FROM upsert_contact_info(
        99999, 
        'test@example.com', 
        '555-1234', 
        '555-5678'
    );
    RAISE NOTICE 'Test 1 - Insert: %', test_result;
    
    -- Test update with clearing email (setting to NULL)
    SELECT * INTO test_result FROM upsert_contact_info(
        99999, 
        NULL,  -- This should clear the email
        '555-9999',  -- Update phone
        '555-5678'   -- Keep mobile
    );
    RAISE NOTICE 'Test 2 - Update with NULL email: %', test_result;
    
    -- Clean up test record
    DELETE FROM contactinfo WHERE account_number = 99999;
    RAISE NOTICE 'Test cleanup complete';
END $$;

-- Verify the contactinfo table structure
SELECT 
    'Table Check' as check_type,
    column_name, 
    data_type, 
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'contactinfo'
ORDER BY ordinal_position;