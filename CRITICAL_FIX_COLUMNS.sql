-- CRITICAL FIX: USE CORRECT COLUMN NAMES
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
    v_account_exists BOOLEAN;
    v_admin_password TEXT;
    v_account_info JSONB;
    v_zip_code TEXT;
    v_has_password BOOLEAN;
BEGIN
    -- Normalize account number
    p_account_number := TRIM(p_account_number);
    p_account_number := LTRIM(p_account_number, '0');
    
    -- Check if account exists - USING CORRECT COLUMN NAMES
    SELECT 
        COUNT(*) > 0,
        MAX(jsonb_build_object(
            'account_number', account_number,
            'acct_name', acct_name,  -- FIXED: was company_name
            'contact_name', contact_name,
            'email', email,
            'phone', phone,
            'zip', zip
        )),
        MAX(zip)
    INTO v_account_exists, v_account_info, v_zip_code
    FROM accounts_lcmd
    WHERE account_number = p_account_number;
    
    -- Account doesn't exist
    IF NOT v_account_exists THEN
        RETURN QUERY SELECT 
            FALSE::BOOLEAN,
            'Invalid account number or password'::TEXT,
            NULL::JSONB,
            FALSE::BOOLEAN;
        RETURN;
    END IF;
    
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
    SELECT 
        COUNT(*) > 0,
        MAX(password_hash)
    INTO v_has_password, v_stored_hash
    FROM user_passwords
    WHERE account_number = p_account_number;
    
    -- No password exists - check ZIP code
    IF NOT v_has_password OR v_stored_hash IS NULL OR v_stored_hash = '' THEN
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

-- TEST IT
DO $$
DECLARE
    v_result RECORD;
BEGIN
    SELECT * INTO v_result FROM authenticate_user_v5('999', '2750grove', NULL);
    RAISE NOTICE 'TEST RESULT: Success=%, Message=%', v_result.success, v_result.message;
END;
$$;