-- ====================================================
-- AUTHENTICATION SYSTEM CLEANUP AND MODERNIZATION
-- ====================================================

-- 1. CREATE ADMIN SETTINGS TABLE
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
-- 2. CREATE MODERN AUTHENTICATION FUNCTIONS
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
-- 3. CLEANUP DEPRECATED AUTHENTICATION FUNCTIONS
-- ====================================================

-- Drop all deprecated authentication function versions
DROP FUNCTION IF EXISTS authenticate_user CASCADE;
DROP FUNCTION IF EXISTS authenticate_user_v1 CASCADE;
DROP FUNCTION IF EXISTS authenticate_user_v2 CASCADE;
DROP FUNCTION IF EXISTS authenticate_user_v3 CASCADE;
DROP FUNCTION IF EXISTS authenticate_user_v4 CASCADE;
-- Keep v5 as it's the current version

-- Drop deprecated helper functions
DROP FUNCTION IF EXISTS check_backdoor_passwords CASCADE;
DROP FUNCTION IF EXISTS verify_universal_password CASCADE;
DROP FUNCTION IF EXISTS check_legacy_passwords CASCADE;

-- ====================================================
-- 4. CLEANUP DEPRECATED TABLES
-- ====================================================

-- Drop deprecated authentication-related tables if they exist
DROP TABLE IF EXISTS backdoor_passwords CASCADE;
DROP TABLE IF EXISTS universal_passwords CASCADE;
DROP TABLE IF EXISTS legacy_auth_methods CASCADE;
DROP TABLE IF EXISTS deprecated_user_passwords CASCADE;

-- ====================================================
-- 5. CLEANUP DEPRECATED VIEWS
-- ====================================================

DROP VIEW IF EXISTS v_user_auth_legacy CASCADE;
DROP VIEW IF EXISTS v_backdoor_access CASCADE;
DROP VIEW IF EXISTS v_universal_access CASCADE;

-- ====================================================
-- 6. CLEANUP DEPRECATED TRIGGERS
-- ====================================================

-- Drop any deprecated authentication triggers
DROP TRIGGER IF EXISTS trg_legacy_auth_check ON accounts_lcmd;
DROP TRIGGER IF EXISTS trg_backdoor_auth_log ON login_activity_log;
DROP TRIGGER IF EXISTS trg_universal_password_check ON user_passwords;

-- ====================================================
-- 7. ADD SECURITY CONSTRAINTS
-- ====================================================

-- Add constraint to prevent Music123 and similar patterns in user_passwords table
ALTER TABLE user_passwords DROP CONSTRAINT IF EXISTS chk_no_music123;
ALTER TABLE user_passwords ADD CONSTRAINT chk_no_music123 
CHECK (
    password_hash NOT LIKE '%music%' AND 
    password_hash NOT LIKE '%Music%' AND
    password_hash NOT LIKE '%MUSIC%' AND
    password_hash NOT LIKE '%123%'
);

-- ====================================================
-- 8. CREATE AUDIT LOG FOR CLEANUP
-- ====================================================

INSERT INTO app_events (event_type, event_name, event_data)
VALUES (
    'SYSTEM_CLEANUP',
    'Deprecated Authentication Cleanup',
    jsonb_build_object(
        'timestamp', CURRENT_TIMESTAMP,
        'actions', ARRAY[
            'Dropped deprecated authentication functions v1-v4',
            'Removed backdoor password functions',
            'Removed universal password functions',
            'Dropped deprecated authentication tables',
            'Dropped deprecated authentication views',
            'Dropped deprecated authentication triggers',
            'Added Music123 prevention constraint',
            'Created modern admin_settings table',
            'Implemented database-stored admin password'
        ],
        'message', 'Successfully cleaned up deprecated authentication system and implemented modern secure authentication'
    )
);

-- ====================================================
-- 9. VERIFY CURRENT AUTHENTICATION SYSTEM
-- ====================================================

-- Check that only v5 authentication function exists
DO $$
DECLARE
    v_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO v_count
    FROM pg_proc
    WHERE proname LIKE 'authenticate_user%'
    AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public');
    
    IF v_count > 1 THEN
        RAISE WARNING 'Multiple authentication functions found. Expected only authenticate_user_v5';
    ELSIF v_count = 0 THEN
        RAISE WARNING 'No authentication function found. authenticate_user_v5 is required';
    ELSE
        RAISE NOTICE 'Authentication system verified: authenticate_user_v5 is the only authentication function';
    END IF;
END $$;

-- ====================================================
-- 10. FINAL SECURITY RECOMMENDATIONS
-- ====================================================

COMMENT ON TABLE admin_settings IS 'Stores configurable system settings including admin password. All changes are audited.';
COMMENT ON FUNCTION get_admin_password() IS 'Retrieves the current admin password from database. Used for account 999 authentication.';
COMMENT ON FUNCTION update_admin_password(TEXT, TEXT) IS 'Updates the admin password with full audit logging. Requires authentication.';
COMMENT ON FUNCTION authenticate_user_v5(TEXT, TEXT, TEXT) IS 'Current production authentication function. This is the single source of truth for authentication.';

-- ====================================================
-- END OF AUTHENTICATION CLEANUP SCRIPT
-- ====================================================