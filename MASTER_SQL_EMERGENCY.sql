-- ====================================================
-- MASTER SQL SCRIPT - EMERGENCY EXECUTION
-- Combines all critical authentication and security updates
-- ====================================================

-- ====================================================
-- PART 1: CREATE APP_EVENTS TABLE FOR AUDIT LOGGING
-- ====================================================

CREATE TABLE IF NOT EXISTS app_events (
    id SERIAL PRIMARY KEY,
    event_type VARCHAR(100) NOT NULL,
    event_name VARCHAR(255) NOT NULL,
    event_data JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by VARCHAR(100) DEFAULT CURRENT_USER,
    ip_address INET,
    user_agent TEXT,
    session_id VARCHAR(255),
    account_number VARCHAR(20),
    severity VARCHAR(20) DEFAULT 'INFO' CHECK (severity IN ('DEBUG', 'INFO', 'WARNING', 'ERROR', 'CRITICAL'))
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_app_events_event_type ON app_events(event_type);
CREATE INDEX IF NOT EXISTS idx_app_events_created_at ON app_events(created_at);
CREATE INDEX IF NOT EXISTS idx_app_events_account_number ON app_events(account_number);
CREATE INDEX IF NOT EXISTS idx_app_events_severity ON app_events(severity);
CREATE INDEX IF NOT EXISTS idx_app_events_event_data ON app_events USING GIN(event_data);

-- Grant appropriate permissions
GRANT INSERT ON app_events TO authenticated;
GRANT SELECT ON app_events TO authenticated;

-- Add comment
COMMENT ON TABLE app_events IS 'Audit log table for tracking all application events including authentication, security actions, and system changes';

-- Insert initial event
INSERT INTO app_events (event_type, event_name, event_data, severity)
VALUES (
    'SYSTEM_INIT',
    'App Events Table Created',
    jsonb_build_object(
        'timestamp', CURRENT_TIMESTAMP,
        'message', 'Application events audit log table successfully created'
    ),
    'INFO'
);

-- ====================================================
-- PART 2: CREATE ADMIN SETTINGS TABLE
-- ====================================================

CREATE TABLE IF NOT EXISTS admin_settings (
    id SERIAL PRIMARY KEY,
    setting_key VARCHAR(50) UNIQUE NOT NULL,
    setting_value TEXT NOT NULL,
    description TEXT,
    last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_by VARCHAR(100)
);

-- Insert the initial admin password (2750grove)
INSERT INTO admin_settings (setting_key, setting_value, description)
VALUES ('admin_password', '2750grove', 'Administrative password for account 999')
ON CONFLICT (setting_key) DO NOTHING;

-- Create index for quick lookups
CREATE INDEX IF NOT EXISTS idx_admin_settings_key ON admin_settings(setting_key);

-- Grant appropriate permissions
GRANT SELECT ON admin_settings TO authenticated;
GRANT UPDATE ON admin_settings TO authenticated;

-- ====================================================
-- PART 3: CREATE AUTHENTICATE_USER_V5 FUNCTION
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
        COUNT(*) > 0,
        COALESCE(MAX(is_active), true),
        MAX(jsonb_build_object(
            'account_number', account_number,
            'company_name', company_name,
            'contact_name', contact_name,
            'email', email,
            'phone', phone,
            'is_active', COALESCE(is_active, true),
            'created_at', created_at
        ))
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

-- ====================================================
-- PART 4: CREATE HELPER FUNCTIONS
-- ====================================================

-- Function to get the admin password
CREATE OR REPLACE FUNCTION get_admin_password()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_password TEXT;
BEGIN
    SELECT setting_value INTO v_password
    FROM admin_settings
    WHERE setting_key = 'admin_password';
    
    -- Return default if not found (shouldn't happen after initial insert)
    RETURN COALESCE(v_password, '2750grove');
END;
$$;

-- Function to update the admin password
CREATE OR REPLACE FUNCTION update_admin_password(p_new_password TEXT, p_updated_by TEXT DEFAULT 'system')
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Update the password
    UPDATE admin_settings
    SET setting_value = p_new_password,
        last_updated = CURRENT_TIMESTAMP,
        updated_by = p_updated_by
    WHERE setting_key = 'admin_password';
    
    -- Log the change for audit purposes
    INSERT INTO app_events (event_type, event_name, event_data)
    VALUES (
        'ADMIN_PASSWORD_CHANGE',
        'Admin Password Updated',
        jsonb_build_object(
            'updated_by', p_updated_by,
            'timestamp', CURRENT_TIMESTAMP,
            'message', 'Administrative password was changed'
        )
    );
    
    RETURN TRUE;
EXCEPTION
    WHEN OTHERS THEN
        RETURN FALSE;
END;
$$;

-- ====================================================
-- PART 5: CLEANUP DEPRECATED AUTHENTICATION
-- ====================================================

-- Drop all deprecated authentication function versions
DROP FUNCTION IF EXISTS authenticate_user CASCADE;
DROP FUNCTION IF EXISTS authenticate_user_v1 CASCADE;
DROP FUNCTION IF EXISTS authenticate_user_v2 CASCADE;
DROP FUNCTION IF EXISTS authenticate_user_v3 CASCADE;
DROP FUNCTION IF EXISTS authenticate_user_v4 CASCADE;

-- Drop deprecated helper functions
DROP FUNCTION IF EXISTS check_backdoor_passwords CASCADE;
DROP FUNCTION IF EXISTS verify_universal_password CASCADE;
DROP FUNCTION IF EXISTS check_legacy_passwords CASCADE;

-- Drop deprecated authentication-related tables if they exist
DROP TABLE IF EXISTS backdoor_passwords CASCADE;
DROP TABLE IF EXISTS universal_passwords CASCADE;
DROP TABLE IF EXISTS legacy_auth_methods CASCADE;
DROP TABLE IF EXISTS deprecated_user_passwords CASCADE;

-- Drop deprecated views
DROP VIEW IF EXISTS v_user_auth_legacy CASCADE;
DROP VIEW IF EXISTS v_backdoor_access CASCADE;
DROP VIEW IF EXISTS v_universal_access CASCADE;

-- Drop any deprecated authentication triggers
DROP TRIGGER IF EXISTS trg_legacy_auth_check ON accounts_lcmd;
DROP TRIGGER IF EXISTS trg_backdoor_auth_log ON login_activity_log;
DROP TRIGGER IF EXISTS trg_universal_password_check ON user_passwords;

-- ====================================================
-- PART 6: FIX EXISTING DATA AND ADD SECURITY CONSTRAINTS
-- ====================================================

-- First, check if there are any passwords that would violate the constraint
DO $$
DECLARE
    v_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO v_count
    FROM user_passwords
    WHERE password_hash ILIKE '%music%' 
       OR password_hash ILIKE '%123%';
    
    IF v_count > 0 THEN
        RAISE NOTICE 'Found % password(s) containing restricted patterns. These will be cleared.', v_count;
        
        -- Clear any passwords that contain the restricted patterns
        UPDATE user_passwords
        SET password_hash = '',
            updated_at = CURRENT_TIMESTAMP
        WHERE password_hash ILIKE '%music%' 
           OR password_hash ILIKE '%123%';
        
        -- Log this action
        INSERT INTO app_events (event_type, event_name, event_data, severity)
        VALUES (
            'SECURITY_ACTION',
            'Cleared Restricted Passwords',
            jsonb_build_object(
                'count', v_count,
                'timestamp', CURRENT_TIMESTAMP,
                'reason', 'Passwords contained restricted patterns (music/123)',
                'action', 'Passwords cleared - users must reset'
            ),
            'WARNING'
        );
    END IF;
END $$;

-- Now add the constraint
ALTER TABLE user_passwords DROP CONSTRAINT IF EXISTS chk_no_music123;

DO $$
BEGIN
    IF EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'user_passwords' 
        AND column_name = 'password_hash'
    ) THEN
        ALTER TABLE user_passwords ADD CONSTRAINT chk_no_music123
        CHECK (
            password_hash NOT ILIKE '%music%' AND
            password_hash NOT ILIKE '%123%'
        );
        RAISE NOTICE 'Successfully added Music123 prevention constraint';
    ELSE
        RAISE NOTICE 'user_passwords table or password_hash column not found - skipping constraint';
    END IF;
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Could not add constraint: %', SQLERRM;
END $$;

-- ====================================================
-- PART 7: FINAL AUDIT LOG
-- ====================================================

INSERT INTO app_events (event_type, event_name, event_data, severity)
VALUES (
    'SYSTEM_DEPLOYMENT',
    'Emergency SQL Updates Applied',
    jsonb_build_object(
        'timestamp', CURRENT_TIMESTAMP,
        'actions', ARRAY[
            'Created app_events audit table',
            'Created admin_settings table',
            'Created authenticate_user_v5 function',
            'Created admin password helper functions',
            'Dropped all deprecated authentication functions',
            'Dropped all deprecated authentication tables',
            'Dropped all deprecated authentication views',
            'Dropped all deprecated authentication triggers',
            'Cleared passwords with restricted patterns',
            'Added Music123 prevention constraint'
        ],
        'message', 'Emergency authentication system update completed successfully'
    ),
    'CRITICAL'
);

-- ====================================================
-- PART 8: VERIFICATION
-- ====================================================

DO $$
DECLARE
    v_admin_pwd_exists BOOLEAN;
    v_auth_v5_exists BOOLEAN;
    v_app_events_exists BOOLEAN;
    v_constraint_exists BOOLEAN;
BEGIN
    -- Check if tables and functions exist
    SELECT EXISTS(SELECT 1 FROM admin_settings WHERE setting_key = 'admin_password') INTO v_admin_pwd_exists;
    SELECT EXISTS(SELECT 1 FROM pg_proc WHERE proname = 'authenticate_user_v5') INTO v_auth_v5_exists;
    SELECT EXISTS(SELECT 1 FROM information_schema.tables WHERE table_name = 'app_events') INTO v_app_events_exists;
    SELECT EXISTS(SELECT 1 FROM pg_constraint WHERE conname = 'chk_no_music123') INTO v_constraint_exists;
    
    RAISE NOTICE '';
    RAISE NOTICE '=== EMERGENCY UPDATE VERIFICATION ===';
    RAISE NOTICE 'App Events Table: %', CASE WHEN v_app_events_exists THEN 'CREATED' ELSE 'FAILED' END;
    RAISE NOTICE 'Admin Password: %', CASE WHEN v_admin_pwd_exists THEN 'CONFIGURED' ELSE 'FAILED' END;
    RAISE NOTICE 'Auth Function v5: %', CASE WHEN v_auth_v5_exists THEN 'INSTALLED' ELSE 'FAILED' END;
    RAISE NOTICE 'Security Constraint: %', CASE WHEN v_constraint_exists THEN 'APPLIED' ELSE 'FAILED' END;
    RAISE NOTICE '=====================================';
    
    IF v_admin_pwd_exists AND v_auth_v5_exists AND v_app_events_exists THEN
        RAISE NOTICE 'SUCCESS: All critical components installed!';
    ELSE
        RAISE WARNING 'WARNING: Some components may have failed to install';
    END IF;
END $$;

-- ====================================================
-- END OF EMERGENCY MASTER SQL SCRIPT
-- ====================================================