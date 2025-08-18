-- ====================================================
-- EMERGENCY FIX: is_active column issue
-- ====================================================

-- Option 1: Add the is_active column if it doesn't exist
ALTER TABLE accounts_lcmd ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

-- Option 2: Fix the function to not rely on is_active
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
    -- Normalize account number (remove spaces and leading zeros)
    p_account_number := TRIM(p_account_number);
    p_account_number := LTRIM(p_account_number, '0');
    
    -- Check if account exists (REMOVED is_active check)
    SELECT 
        COUNT(*) > 0,
        MAX(jsonb_build_object(
            'account_number', account_number,
            'company_name', company_name,
            'contact_name', contact_name,
            'email', email,
            'phone', phone,
            'created_at', created_at,
            'zip', zip
        )),
        MAX(zip)
    INTO v_account_exists, v_account_info, v_zip_code
    FROM accounts_lcmd
    WHERE account_number = p_account_number;
    
    -- If account doesn't exist
    IF NOT v_account_exists THEN
        -- Log failed attempt
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'app_events') THEN
            INSERT INTO app_events (
                event_type,
                event_name,
                event_data,
                account_number,
                ip_address,
                severity
            ) VALUES (
                'AUTH_FAILED',
                'Account Not Found',
                jsonb_build_object(
                    'account_number', p_account_number,
                    'timestamp', CURRENT_TIMESTAMP
                ),
                p_account_number,
                p_ip_address::INET,
                'WARNING'
            );
        END IF;
        
        RETURN QUERY SELECT 
            FALSE::BOOLEAN,
            'Invalid account number or password'::TEXT,
            NULL::JSONB,
            FALSE::BOOLEAN;
        RETURN;
    END IF;
    
    -- Special handling for account 999 (admin account)
    IF p_account_number = '999' THEN
        -- Get admin password from admin_settings table or use default
        IF EXISTS (
            SELECT 1 FROM information_schema.tables 
            WHERE table_name = 'admin_settings'
        ) THEN
            SELECT setting_value INTO v_admin_password
            FROM admin_settings
            WHERE setting_key = 'admin_password';
        END IF;
        
        -- Use default if not found
        v_admin_password := COALESCE(v_admin_password, '2750grove');
        
        IF p_password = v_admin_password THEN
            -- Log successful admin login
            IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'app_events') THEN
                INSERT INTO app_events (
                    event_type,
                    event_name,
                    event_data,
                    account_number,
                    ip_address,
                    severity
                ) VALUES (
                    'AUTH_SUCCESS',
                    'Admin Login',
                    jsonb_build_object(
                        'account_number', p_account_number,
                        'method', 'ADMIN',
                        'timestamp', CURRENT_TIMESTAMP
                    ),
                    p_account_number,
                    p_ip_address::INET,
                    'INFO'
                );
            END IF;
            
            RETURN QUERY SELECT 
                TRUE::BOOLEAN,
                'Admin login successful'::TEXT,
                v_account_info,
                FALSE::BOOLEAN;
            RETURN;
        ELSE
            -- Admin password incorrect
            RETURN QUERY SELECT 
                FALSE::BOOLEAN,
                'Invalid account number or password'::TEXT,
                NULL::JSONB,
                FALSE::BOOLEAN;
            RETURN;
        END IF;
    END IF;
    
    -- Check if user has a password set
    SELECT 
        COUNT(*) > 0,
        MAX(password_hash)
    INTO v_has_password, v_stored_hash
    FROM user_passwords
    WHERE account_number = p_account_number;
    
    -- If no password exists in user_passwords table
    IF NOT v_has_password OR v_stored_hash IS NULL OR v_stored_hash = '' THEN
        -- Check if the provided password matches the ZIP code
        IF v_zip_code IS NOT NULL AND p_password = v_zip_code THEN
            -- ZIP code authentication successful - needs password initialization
            IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'app_events') THEN
                INSERT INTO app_events (
                    event_type,
                    event_name,
                    event_data,
                    account_number,
                    ip_address,
                    severity
                ) VALUES (
                    'AUTH_ZIP_CODE',
                    'ZIP Code Authentication - Password Setup Required',
                    jsonb_build_object(
                        'account_number', p_account_number,
                        'timestamp', CURRENT_TIMESTAMP,
                        'message', 'User authenticated with ZIP code, password initialization required'
                    ),
                    p_account_number,
                    p_ip_address::INET,
                    'INFO'
                );
            END IF;
            
            RETURN QUERY SELECT 
                TRUE::BOOLEAN,
                'Please create your password to complete setup'::TEXT,
                v_account_info,
                TRUE::BOOLEAN;  -- needs_password_initialization = TRUE
            RETURN;
        ELSE
            -- No password set and ZIP code doesn't match
            RETURN QUERY SELECT 
                FALSE::BOOLEAN,
                'No password set for this account. Please use your ZIP code to initialize.'::TEXT,
                NULL::JSONB,
                FALSE::BOOLEAN;
            RETURN;
        END IF;
    END IF;
    
    -- Verify password (user has a password in user_passwords table)
    IF v_stored_hash = p_password THEN
        -- Log successful login
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'app_events') THEN
            INSERT INTO app_events (
                event_type,
                event_name,
                event_data,
                account_number,
                ip_address,
                severity
            ) VALUES (
                'AUTH_SUCCESS',
                'Standard Login',
                jsonb_build_object(
                    'account_number', p_account_number,
                    'method', 'STANDARD',
                    'timestamp', CURRENT_TIMESTAMP
                ),
                p_account_number,
                p_ip_address::INET,
                'INFO'
            );
        END IF;
        
        RETURN QUERY SELECT 
            TRUE::BOOLEAN,
            'Login successful'::TEXT,
            v_account_info,
            FALSE::BOOLEAN;  -- needs_password_initialization = FALSE
        RETURN;
    ELSE
        -- Password doesn't match
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'app_events') THEN
            INSERT INTO app_events (
                event_type,
                event_name,
                event_data,
                account_number,
                ip_address,
                severity
            ) VALUES (
                'AUTH_FAILED',
                'Invalid Password',
                jsonb_build_object(
                    'account_number', p_account_number,
                    'timestamp', CURRENT_TIMESTAMP
                ),
                p_account_number,
                p_ip_address::INET,
                'WARNING'
            );
        END IF;
        
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

-- Quick test to verify admin login works
DO $$
DECLARE
    v_result RECORD;
BEGIN
    SELECT * INTO v_result FROM authenticate_user_v5('999', '2750grove', NULL);
    IF v_result.success THEN
        RAISE NOTICE '✅ Admin login test PASSED';
    ELSE
        RAISE WARNING '❌ Admin login test FAILED';
    END IF;
END $$;

-- Verification
COMMENT ON FUNCTION authenticate_user_v5(TEXT, TEXT, TEXT) IS 'Emergency fix: Removed is_active column dependency. Admin 999 uses 2750grove, regular users use passwords, new users use ZIP codes.';