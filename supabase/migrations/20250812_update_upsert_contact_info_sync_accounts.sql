-- Update the upsert_contact_info function to also update the accounts_lcmd table
-- This ensures contact info changes are immediately reflected in the main accounts table

CREATE OR REPLACE FUNCTION upsert_contact_info(
    p_account_number INTEGER,
    p_email_address TEXT,
    p_business_phone TEXT,
    p_mobile_phone TEXT
)
RETURNS TABLE(
    out_account_number INTEGER,
    out_email_address TEXT,
    out_business_phone TEXT,
    out_mobile_phone TEXT,
    out_updated_at TIMESTAMP WITH TIME ZONE
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- First, update the contactinfo table
    INSERT INTO contactinfo (account_number, email_address, business_phone, mobile_phone)
    VALUES (p_account_number, p_email_address, p_business_phone, p_mobile_phone)
    ON CONFLICT (account_number) 
    DO UPDATE SET
        email_address = EXCLUDED.email_address,
        business_phone = EXCLUDED.business_phone,
        mobile_phone = EXCLUDED.mobile_phone,
        updated_at = CURRENT_TIMESTAMP;
    
    -- Now also update the accounts_lcmd table with the same contact info
    UPDATE accounts_lcmd
    SET 
        email_address = p_email_address,
        phone = p_business_phone,
        mobile_phone = p_mobile_phone
    WHERE account_number = p_account_number;
    
    -- Return the updated record from contactinfo
    RETURN QUERY
    SELECT 
        ci.account_number AS out_account_number, 
        ci.email_address AS out_email_address, 
        ci.business_phone AS out_business_phone, 
        ci.mobile_phone AS out_mobile_phone, 
        ci.updated_at AS out_updated_at
    FROM contactinfo ci
    WHERE ci.account_number = p_account_number;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION upsert_contact_info(INTEGER, TEXT, TEXT, TEXT) TO authenticated;
