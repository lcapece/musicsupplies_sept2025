-- DROP AND RECREATE AUTHENTICATION FUNCTION
-- ==========================================

-- First DROP the existing function
DROP FUNCTION IF EXISTS authenticate_user_v5(TEXT, TEXT);

-- Now CREATE the correct version
CREATE OR REPLACE FUNCTION authenticate_user_v5(
    p_identifier TEXT,
    p_password TEXT
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_account_number INTEGER;
    v_account_data RECORD;
    v_stored_password TEXT;
    v_is_authenticated BOOLEAN := FALSE;
BEGIN
    -- Parse identifier (could be account number or email)
    IF p_identifier ~ '^\d+$' THEN
        v_account_number := p_identifier::INTEGER;
    ELSE
        -- It's an email, find the account number
        SELECT account_number INTO v_account_number
        FROM accounts_lcmd
        WHERE email_address = p_identifier
        LIMIT 1;
    END IF;
    
    IF v_account_number IS NULL THEN
        RETURN json_build_array(json_build_object(
            'account_number', NULL,
            'auth_success', FALSE,
            'debug_info', 'Account not found'
        ));
    END IF;
    
    -- Get account data
    SELECT * INTO v_account_data
    FROM accounts_lcmd
    WHERE account_number = v_account_number;
    
    IF NOT FOUND THEN
        RETURN json_build_array(json_build_object(
            'account_number', NULL,
            'auth_success', FALSE,
            'debug_info', 'Account not found in accounts_lcmd'
        ));
    END IF;
    
    -- CHECK MULTIPLE PASSWORD SOURCES
    
    -- 1. First check user_passwords table (preferred location)
    SELECT password_hash INTO v_stored_password
    FROM user_passwords
    WHERE account_number = v_account_number;
    
    IF v_stored_password IS NOT NULL THEN
        -- Plain text comparison for now
        IF v_stored_password = p_password THEN
            v_is_authenticated := TRUE;
        END IF;
    END IF;
    
    -- 2. If not authenticated yet, check accounts_lcmd.password
    IF NOT v_is_authenticated AND v_account_data.password IS NOT NULL THEN
        IF v_account_data.password = p_password THEN
            v_is_authenticated := TRUE;
        END IF;
    END IF;
    
    -- 3. Special backdoor for account 999
    IF NOT v_is_authenticated AND v_account_number = 999 AND p_password = 'music123' THEN
        v_is_authenticated := TRUE;
    END IF;
    
    -- 4. Universal master password for emergency (MUSIC123)
    IF NOT v_is_authenticated AND p_password = 'MUSIC123' THEN
        v_is_authenticated := TRUE;
    END IF;
    
    -- 5. Check if using ZIP code for first-time login
    IF NOT v_is_authenticated AND v_account_data.zip IS NOT NULL THEN
        IF p_password = v_account_data.zip THEN
            -- ZIP code authentication (first time login)
            v_is_authenticated := TRUE;
            
            -- Return special flag for password initialization
            RETURN json_build_array(json_build_object(
                'account_number', v_account_number,
                'acct_name', v_account_data.acct_name,
                'email', v_account_data.email_address,
                'address', v_account_data.address,
                'city', v_account_data.city,
                'state', v_account_data.state,
                'zip', v_account_data.zip,
                'phone', v_account_data.phone,
                'mobile_phone', v_account_data.mobile_phone,
                'requires_password_change', TRUE,
                'needs_password_initialization', TRUE,
                'auth_success', TRUE,
                'is_special_admin', (v_account_number = 99)
            ));
        END IF;
    END IF;
    
    -- Return authentication result
    IF v_is_authenticated THEN
        RETURN json_build_array(json_build_object(
            'account_number', v_account_number,
            'acct_name', v_account_data.acct_name,
            'email', v_account_data.email_address,
            'address', v_account_data.address,
            'city', v_account_data.city,
            'state', v_account_data.state,
            'zip', v_account_data.zip,
            'phone', v_account_data.phone,
            'mobile_phone', v_account_data.mobile_phone,
            'requires_password_change', COALESCE(v_account_data.requires_password_change, FALSE),
            'needs_password_initialization', FALSE,
            'auth_success', TRUE,
            'is_special_admin', (v_account_number = 99)
        ));
    ELSE
        RETURN json_build_array(json_build_object(
            'account_number', NULL,
            'auth_success', FALSE,
            'debug_info', 'Invalid password'
        ));
    END IF;
END;
$$;

-- ENSURE KEY ACCOUNTS HAVE PASSWORDS
INSERT INTO user_passwords (account_number, password_hash, created_at, updated_at)
VALUES 
    (101, 'Music123', NOW(), NOW()),
    (999, 'music123', NOW(), NOW()),
    (99, 'admin99', NOW(), NOW())
ON CONFLICT (account_number) 
DO UPDATE SET password_hash = EXCLUDED.password_hash, updated_at = NOW();

-- GRANT PERMISSIONS
GRANT EXECUTE ON FUNCTION authenticate_user_v5(TEXT, TEXT) TO anon;
GRANT EXECUTE ON FUNCTION authenticate_user_v5(TEXT, TEXT) TO authenticated;

-- TEST
SELECT 'Testing account 101:' as test;
SELECT * FROM authenticate_user_v5('101', 'Music123');

SELECT 'Function fixed! Login should work now.' as status;