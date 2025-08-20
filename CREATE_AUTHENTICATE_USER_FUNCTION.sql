-- URGENT: Run this in Supabase dashboard to fix 999 login with 2FA
-- This creates/replaces the authenticate_user function that handles 2FA for account 999

CREATE OR REPLACE FUNCTION authenticate_user(
    p_identifier TEXT,
    p_password TEXT, 
    p_ip_address TEXT DEFAULT NULL,
    p_2fa_code VARCHAR(6) DEFAULT NULL
)
RETURNS TABLE(
    account_number BIGINT,
    acct_name TEXT,
    address TEXT,
    city TEXT,
    state TEXT,
    zip TEXT,
    id BIGINT,
    email_address TEXT,
    phone TEXT,
    mobile_phone TEXT,
    requires_password_change BOOLEAN,
    is_special_admin BOOLEAN,
    requires_2fa BOOLEAN,
    needs_password_initialization BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    user_record RECORD;
    is_valid_password BOOLEAN := FALSE;
    is_valid_2fa BOOLEAN := FALSE;
BEGIN
    -- Handle account 999 (admin) with special 2FA requirements
    IF p_identifier = '999' THEN
        -- Validate admin password first
        SELECT validate_admin_password(p_password) INTO is_valid_password;
        
        IF NOT is_valid_password THEN
            -- Invalid password - return empty result
            RETURN;
        END IF;
        
        -- If no 2FA code provided, generate one and return requiring 2FA
        IF p_2fa_code IS NULL THEN
            -- Generate and store 2FA code
            PERFORM store_2fa_code(999, 
                LPAD(FLOOR(RANDOM() * 1000000)::TEXT, 6, '0'), 
                p_ip_address);
            
            -- Return admin data requiring 2FA
            RETURN QUERY SELECT 
                999::BIGINT as account_number,
                'Admin Account'::TEXT as acct_name,
                ''::TEXT as address,
                ''::TEXT as city, 
                ''::TEXT as state,
                ''::TEXT as zip,
                999::BIGINT as id,
                'admin@musicsupplies.com'::TEXT as email_address,
                ''::TEXT as phone,
                ''::TEXT as mobile_phone,
                FALSE as requires_password_change,
                TRUE as is_special_admin,
                TRUE as requires_2fa,
                FALSE as needs_password_initialization;
            RETURN;
        END IF;
        
        -- Validate 2FA code
        SELECT validate_2fa_code(999, p_2fa_code) INTO is_valid_2fa;
        
        IF NOT is_valid_2fa THEN
            -- Invalid 2FA code - return empty result
            RETURN;
        END IF;
        
        -- Both password and 2FA are valid - return full access
        RETURN QUERY SELECT 
            999::BIGINT as account_number,
            'Admin Account'::TEXT as acct_name,
            ''::TEXT as address,
            ''::TEXT as city,
            ''::TEXT as state, 
            ''::TEXT as zip,
            999::BIGINT as id,
            'admin@musicsupplies.com'::TEXT as email_address,
            ''::TEXT as phone,
            ''::TEXT as mobile_phone,
            FALSE as requires_password_change,
            TRUE as is_special_admin,
            FALSE as requires_2fa,  -- 2FA completed
            FALSE as needs_password_initialization;
        RETURN;
    END IF;
    
    -- Handle regular accounts (non-999)
    -- First try account number
    IF p_identifier ~ '^[0-9]+$' THEN
        SELECT * INTO user_record 
        FROM accounts_lcmd 
        WHERE accountnumber = p_identifier::BIGINT;
    ELSE
        -- Try email
        SELECT * INTO user_record 
        FROM accounts_lcmd 
        WHERE email_address = p_identifier;
    END IF;
    
    -- Check if user exists
    IF user_record IS NULL THEN
        RETURN;
    END IF;
    
    -- Validate password (simplified - you may need different logic)
    IF user_record.password IS NULL OR user_record.password != p_password THEN
        RETURN;
    END IF;
    
    -- Return regular user data
    RETURN QUERY SELECT 
        user_record.accountnumber::BIGINT as account_number,
        user_record.acctname::TEXT as acct_name,
        user_record.address::TEXT as address,
        user_record.city::TEXT as city,
        user_record.state::TEXT as state,
        user_record.zip::TEXT as zip,
        user_record.accountnumber::BIGINT as id,
        user_record.email_address::TEXT as email_address,
        user_record.phone::TEXT as phone,
        user_record.mobile_phone::TEXT as mobile_phone,
        COALESCE(user_record.requires_password_change, FALSE) as requires_password_change,
        FALSE as is_special_admin,
        FALSE as requires_2fa,
        FALSE as needs_password_initialization;
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION authenticate_user(TEXT, TEXT, TEXT, VARCHAR) TO anon;
GRANT EXECUTE ON FUNCTION authenticate_user(TEXT, TEXT, TEXT, VARCHAR) TO authenticated;

-- Test the function
SELECT * FROM authenticate_user('999', '2750GroveAvenue', 'test', null) as test_no_2fa;
SELECT * FROM authenticate_user('999', '2750GroveAvenue', 'test', '123456') as test_with_2fa;