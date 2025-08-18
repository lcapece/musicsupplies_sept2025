-- ====================================================
-- CREATE AUTHENTICATE_USER_V5 FUNCTION
-- Modern authentication function for MusicSupplies
-- ====================================================

CREATE OR REPLACE FUNCTION authenticate_user_v5(
    p_account_number TEXT,
    p_password TEXT,
    p_ip_address TEXT DEFAULT NULL
)
RETURNS TABLE (
    success BOOLEAN,
    message TEXT,
    account_data JSONB
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_stored_hash TEXT;
    v_account_exists BOOLEAN;
    v_is_active BOOLEAN;
    v_admin_password TEXT;
    v_account_info JSONB;
BEGIN
    -- Normalize account number (remove spaces and leading zeros)
    p_account_number := TRIM(p_account_number);
    p_account_number := LTRIM(p_account_number, '0');
    
    -- Check if account exists and is active
    SELECT 
        EXISTS(1),
        COALESCE(is_active, true),
        jsonb_build_object(
            'account_number', account_number,
            'company_name', company_name,
            'contact_name', contact_name,
            'email', email,
            'phone', phone,
            'is_active', COALESCE(is_active, true),
            'created_at', created_at
        )
    INTO v_account_exists, v_is_active, v_account_info
    FROM accounts_lcmd
    WHERE account_number = p_account_number;
    
    -- If account doesn't exist
    IF NOT v_account_exists THEN
        -- Log failed attempt
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'login_activity_log') THEN
            INSERT INTO login_activity_log (
                account_number,
                login_status,
                ip_address,
                error_message
            ) VALUES (
                p_account_number,
                'FAILED',
                p_ip_address::INET,
                'Account not found'
            );
        END IF;
        
        RETURN QUERY SELECT 
            FALSE::BOOLEAN,
            'Invalid account number or password'::TEXT,
            NULL::JSONB;
        RETURN;
    END IF;
    
    -- Check if account is inactive
    IF NOT v_is_active THEN
        -- Log failed attempt
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'login_activity_log') THEN
            INSERT INTO login_activity_log (
                account_number,
                login_status,
                ip_address,
                error_message
            ) VALUES (
                p_account_number,
                'FAILED',
                p_ip_address::INET,
                'Account is inactive'
            );
        END IF;
        
        RETURN QUERY SELECT 
            FALSE::BOOLEAN,
            'Account is inactive. Please contact support.'::TEXT,
            NULL::JSONB;
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
            IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'login_activity_log') THEN
                INSERT INTO login_activity_log (
                    account_number,
                    login_status,
                    ip_address,
                    login_method
                ) VALUES (
                    p_account_number,
                    'SUCCESS',
                    p_ip_address::INET,
                    'ADMIN'
                );
            END IF;
            
            RETURN QUERY SELECT 
                TRUE::BOOLEAN,
                'Admin login successful'::TEXT,
                v_account_info;
            RETURN;
        END IF;
    END IF;
    
    -- Get stored password hash for regular accounts
    SELECT password_hash INTO v_stored_hash
    FROM user_passwords
    WHERE account_number = p_account_number;
    
    -- If no password is set
    IF v_stored_hash IS NULL OR v_stored_hash = '' THEN
        -- Log failed attempt
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'login_activity_log') THEN
            INSERT INTO login_activity_log (
                account_number,
                login_status,
                ip_address,
                error_message
            ) VALUES (
                p_account_number,
                'FAILED',
                p_ip_address::INET,
                'No password set'
            );
        END IF;
        
        RETURN QUERY SELECT 
            FALSE::BOOLEAN,
            'No password set for this account. Please reset your password.'::TEXT,
            NULL::JSONB;
        RETURN;
    END IF;
    
    -- Verify password (assuming plain text comparison for now - should use proper hashing in production)
    IF v_stored_hash = p_password THEN
        -- Log successful login
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'login_activity_log') THEN
            INSERT INTO login_activity_log (
                account_number,
                login_status,
                ip_address,
                login_method
            ) VALUES (
                p_account_number,
                'SUCCESS',
                p_ip_address::INET,
                'STANDARD'
            );
        END IF;
        
        -- Update last login time if column exists
        IF EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'accounts_lcmd' 
            AND column_name = 'last_login'
        ) THEN
            UPDATE accounts_lcmd
            SET last_login = CURRENT_TIMESTAMP
            WHERE account_number = p_account_number;
        END IF;
        
        RETURN QUERY SELECT 
            TRUE::BOOLEAN,
            'Login successful'::TEXT,
            v_account_info;
        RETURN;
    ELSE
        -- Log failed attempt
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'login_activity_log') THEN
            INSERT INTO login_activity_log (
                account_number,
                login_status,
                ip_address,
                error_message
            ) VALUES (
                p_account_number,
                'FAILED',
                p_ip_address::INET,
                'Invalid password'
            );
        END IF;
        
        RETURN QUERY SELECT 
            FALSE::BOOLEAN,
            'Invalid account number or password'::TEXT,
            NULL::JSONB;
        RETURN;
    END IF;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION authenticate_user_v5(TEXT, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION authenticate_user_v5(TEXT, TEXT, TEXT) TO anon;

-- Add function comment
COMMENT ON FUNCTION authenticate_user_v5(TEXT, TEXT, TEXT) IS 'Production authentication function v5. Handles regular user authentication and admin account 999 with special password from admin_settings table.';