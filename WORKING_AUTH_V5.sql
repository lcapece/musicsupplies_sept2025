-- WORKING VERSION - NO MAX() ON JSONB
DROP FUNCTION IF EXISTS authenticate_user_v5(TEXT, TEXT, TEXT);

CREATE OR REPLACE FUNCTION authenticate_user_v5(
    p_account_number TEXT,
    p_password TEXT,
    p_ip_address TEXT DEFAULT NULL
)
RETURNS TABLE (
    success BOOLEAN,
    message TEXT,
    account_data JSONB,
    needs_password_initialization BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_stored_hash TEXT;
    v_admin_password TEXT;
    v_account_info JSONB;
    v_zip_code TEXT;
    v_has_password BOOLEAN;
    v_acct_name TEXT;
    v_contact TEXT;
    v_email TEXT;
    v_phone TEXT;
    v_address TEXT;
    v_city TEXT;
    v_state TEXT;
    v_mobile_phone TEXT;
BEGIN
    -- Normalize account number
    p_account_number := TRIM(p_account_number);
    p_account_number := LTRIM(p_account_number, '0');
    
    -- Get account data
    SELECT 
        acct_name,
        contact,
        email_address,
        phone,
        zip,
        address,
        city,
        state,
        mobile_phone
    INTO
        v_acct_name,
        v_contact,
        v_email,
        v_phone,
        v_zip_code,
        v_address,
        v_city,
        v_state,
        v_mobile_phone
    FROM accounts_lcmd
    WHERE account_number::text = p_account_number
    LIMIT 1;
    
    -- Account doesn't exist
    IF NOT FOUND THEN
        RETURN QUERY SELECT 
            FALSE::BOOLEAN,
            'Invalid account number or password'::TEXT,
            NULL::JSONB,
            FALSE::BOOLEAN;
        RETURN;
    END IF;
    
    -- Build account info JSON
    v_account_info := jsonb_build_object(
        'account_number', p_account_number,
        'acct_name', v_acct_name,
        'contact', v_contact,
        'email', v_email,
        'phone', v_phone,
        'zip', v_zip_code,
        'address', v_address,
        'city', v_city,
        'state', v_state,
        'mobile_phone', v_mobile_phone
    );
    
    -- Special handling for account 999
    IF p_account_number = '999' THEN
        -- Get admin password from settings
        SELECT setting_value INTO v_admin_password
        FROM admin_settings
        WHERE setting_key = 'admin_password';
        
        -- Use default if not found
        v_admin_password := COALESCE(v_admin_password, '2750grove');
        
        IF p_password = v_admin_password THEN
            RETURN QUERY SELECT 
                TRUE::BOOLEAN,
                'Admin login successful'::TEXT,
                v_account_info,
                FALSE::BOOLEAN;
            RETURN;
        ELSE
            RETURN QUERY SELECT 
                FALSE::BOOLEAN,
                'Invalid account number or password'::TEXT,
                NULL::JSONB,
                FALSE::BOOLEAN;
            RETURN;
        END IF;
    END IF;
    
    -- Check if user has password
    SELECT password_hash INTO v_stored_hash
    FROM user_passwords
    WHERE account_number = p_account_number;
    
    -- No password exists - check ZIP code
    IF v_stored_hash IS NULL OR v_stored_hash = '' THEN
        IF v_zip_code IS NOT NULL AND p_password = v_zip_code THEN
            -- ZIP authentication successful
            RETURN QUERY SELECT 
                TRUE::BOOLEAN,
                'Please create your password'::TEXT,
                v_account_info,
                TRUE::BOOLEAN;
            RETURN;
        ELSE
            RETURN QUERY SELECT 
                FALSE::BOOLEAN,
                'No password set. Please use your ZIP code.'::TEXT,
                NULL::JSONB,
                FALSE::BOOLEAN;
            RETURN;
        END IF;
    END IF;
    
    -- Verify password
    IF v_stored_hash = p_password THEN
        RETURN QUERY SELECT 
            TRUE::BOOLEAN,
            'Login successful'::TEXT,
            v_account_info,
            FALSE::BOOLEAN;
        RETURN;
    ELSE
        RETURN QUERY SELECT 
            FALSE::BOOLEAN,
            'Invalid account number or password'::TEXT,
            NULL::JSONB,
            FALSE::BOOLEAN;
        RETURN;
    END IF;
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION authenticate_user_v5(TEXT, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION authenticate_user_v5(TEXT, TEXT, TEXT) TO anon;

-- TEST admin login
DO $$
DECLARE
    v_result RECORD;
BEGIN
    SELECT * INTO v_result FROM authenticate_user_v5('999', '2750grove', NULL);
    RAISE NOTICE '';
    RAISE NOTICE '========= ADMIN LOGIN TEST =========';
    IF v_result.success THEN
        RAISE NOTICE '✅ SUCCESS: %', v_result.message;
    ELSE
        RAISE NOTICE '❌ FAILED: %', v_result.message;
    END IF;
    RAISE NOTICE '====================================';
END;
$$;