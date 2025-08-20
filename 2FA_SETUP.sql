-- 2FA Setup for Account 999
-- Creates tables and functions for two-factor authentication

-- Create 2FA phone numbers table if it doesn't exist
CREATE TABLE IF NOT EXISTS public."2fa" (
    id SERIAL PRIMARY KEY,
    phonenumber TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Create table to store active 2FA codes
CREATE TABLE IF NOT EXISTS public.two_factor_codes (
    id SERIAL PRIMARY KEY,
    account_number INTEGER NOT NULL,
    code VARCHAR(6) NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    expires_at TIMESTAMP NOT NULL,
    used BOOLEAN DEFAULT FALSE,
    ip_address TEXT
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_2fa_codes_lookup 
ON two_factor_codes(account_number, code, used, expires_at);

-- Function to generate and send 2FA code
CREATE OR REPLACE FUNCTION generate_2fa_code(
    p_account_number INTEGER,
    p_ip_address TEXT DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_code VARCHAR(6);
    v_phone_numbers TEXT[];
    v_phone TEXT;
    v_expires_at TIMESTAMP;
BEGIN
    -- Only allow 2FA for account 999
    IF p_account_number != 999 THEN
        RETURN json_build_object('success', false, 'message', '2FA not required');
    END IF;
    
    -- Generate random 6-digit code
    v_code := LPAD(FLOOR(RANDOM() * 1000000)::TEXT, 6, '0');
    
    -- Set expiration to 90 seconds from now
    v_expires_at := NOW() + INTERVAL '90 seconds';
    
    -- Store the code
    INSERT INTO two_factor_codes (account_number, code, expires_at, ip_address)
    VALUES (p_account_number, v_code, v_expires_at, p_ip_address);
    
    -- Get all phone numbers from 2fa table
    SELECT ARRAY_AGG(phonenumber) INTO v_phone_numbers
    FROM public."2fa";
    
    -- Send SMS to each phone number
    IF v_phone_numbers IS NOT NULL THEN
        FOREACH v_phone IN ARRAY v_phone_numbers
        LOOP
            -- Log SMS send attempt (actual SMS integration would go here)
            INSERT INTO app_events (event_type, event_name, event_data)
            VALUES ('2FA_SMS', 'Code Sent', jsonb_build_object(
                'phone', v_phone,
                'code', v_code,
                'account', p_account_number,
                'expires_at', v_expires_at
            ));
        END LOOP;
    END IF;
    
    RETURN json_build_object(
        'success', true, 
        'message', '2FA code sent',
        'expires_at', v_expires_at
    );
END;
$$;

-- Function to validate 2FA code
CREATE OR REPLACE FUNCTION validate_2fa_code(
    p_account_number INTEGER,
    p_code VARCHAR(6)
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_valid BOOLEAN;
BEGIN
    -- Check if code exists, is not used, and not expired
    UPDATE two_factor_codes
    SET used = TRUE
    WHERE account_number = p_account_number
      AND code = p_code
      AND used = FALSE
      AND expires_at > NOW()
    RETURNING TRUE INTO v_valid;
    
    RETURN COALESCE(v_valid, FALSE);
END;
$$;

-- Enhanced authentication function with 2FA
CREATE OR REPLACE FUNCTION authenticate_user(
    p_identifier TEXT,
    p_password TEXT,
    p_ip_address TEXT DEFAULT NULL,
    p_2fa_code VARCHAR(6) DEFAULT NULL
)
RETURNS TABLE (
    account_number INTEGER,
    acct_name TEXT,
    address TEXT,
    city TEXT,
    state TEXT,
    zip TEXT,
    id UUID,
    email_address TEXT,
    phone TEXT,
    mobile_phone TEXT,
    requires_password_change BOOLEAN,
    is_special_admin BOOLEAN,
    needs_password_initialization BOOLEAN,
    requires_2fa BOOLEAN
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_account RECORD;
    v_stored_password TEXT;
    v_is_email BOOLEAN;
    v_requires_2fa BOOLEAN := FALSE;
BEGIN
    -- SECURITY BLOCK 1: Reject Music123 immediately
    IF LOWER(p_password) LIKE '%music%' OR p_password LIKE '%123%' THEN
        INSERT INTO app_events (event_type, event_name, event_data)
        VALUES ('SECURITY_VIOLATION', 'Music123_Blocked', 
                jsonb_build_object('identifier', p_identifier, 'ip', p_ip_address));
        RETURN;
    END IF;

    -- SECURITY BLOCK 2: Reject empty credentials
    IF p_identifier IS NULL OR p_identifier = '' OR p_password IS NULL OR p_password = '' THEN
        RETURN;
    END IF;

    -- Determine if email or account number
    v_is_email := position('@' in p_identifier) > 0;
    
    -- Find the account
    IF v_is_email THEN
        SELECT * INTO v_account
        FROM accounts_lcmd
        WHERE LOWER(email_address) = LOWER(p_identifier);
    ELSE
        BEGIN
            SELECT * INTO v_account
            FROM accounts_lcmd
            WHERE account_number = p_identifier::INTEGER;
        EXCEPTION WHEN OTHERS THEN
            INSERT INTO login_activity_log (login_success, ip_address, identifier_used)
            VALUES (false, p_ip_address, p_identifier);
            RETURN;
        END;
    END IF;

    -- Account must exist
    IF v_account IS NULL THEN
        INSERT INTO login_activity_log (login_success, ip_address, identifier_used)
        VALUES (false, p_ip_address, p_identifier);
        RETURN;
    END IF;

    -- Check if this is account 999 (requires 2FA)
    IF v_account.account_number = 999 THEN
        v_requires_2fa := TRUE;
        
        -- If no 2FA code provided, return with 2FA required flag
        IF p_2fa_code IS NULL OR p_2fa_code = '' THEN
            RETURN QUERY
            SELECT 
                v_account.account_number,
                v_account.acct_name,
                ''::TEXT, ''::TEXT, ''::TEXT, ''::TEXT, -- Hide sensitive data
                NULL::UUID,
                ''::TEXT, ''::TEXT, ''::TEXT,
                FALSE, FALSE, FALSE,
                TRUE; -- requires_2fa
            RETURN;
        END IF;
        
        -- Validate 2FA code
        IF NOT validate_2fa_code(999, p_2fa_code) THEN
            INSERT INTO app_events (event_type, event_name, event_data)
            VALUES ('2FA_FAILURE', 'Invalid Code', 
                    jsonb_build_object('account', 999, 'ip', p_ip_address));
            INSERT INTO login_activity_log (account_number, login_success, ip_address, identifier_used)
            VALUES (999, false, p_ip_address, p_identifier);
            RETURN;
        END IF;
    END IF;

    -- Get the stored password
    SELECT password INTO v_stored_password
    FROM account_passwords
    WHERE account_number = v_account.account_number;

    -- Handle accounts with no password (ZIP authentication)
    IF v_stored_password IS NULL OR v_stored_password = '' THEN
        IF p_password = v_account.zip THEN
            INSERT INTO login_activity_log (account_number, login_success, ip_address, identifier_used)
            VALUES (v_account.account_number, true, p_ip_address, p_identifier);
            
            RETURN QUERY
            SELECT 
                v_account.account_number,
                v_account.acct_name,
                v_account.address,
                v_account.city,
                v_account.state,
                v_account.zip,
                v_account.user_id,
                v_account.email_address,
                v_account.phone,
                v_account.mobile_phone,
                v_account.requires_password_change,
                (v_account.account_number = 99),
                TRUE, -- needs_password_initialization
                FALSE; -- requires_2fa
            RETURN;
        ELSE
            INSERT INTO login_activity_log (account_number, login_success, ip_address, identifier_used)
            VALUES (v_account.account_number, false, p_ip_address, p_identifier);
            RETURN;
        END IF;
    END IF;

    -- Password must match EXACTLY (case-sensitive)
    IF v_stored_password != p_password THEN
        INSERT INTO login_activity_log (account_number, login_success, ip_address, identifier_used)
        VALUES (v_account.account_number, false, p_ip_address, p_identifier);
        RETURN;
    END IF;

    -- SUCCESS: Authentication complete
    INSERT INTO login_activity_log (account_number, login_success, ip_address, identifier_used)
    VALUES (v_account.account_number, true, p_ip_address, p_identifier);

    RETURN QUERY
    SELECT 
        v_account.account_number,
        v_account.acct_name,
        v_account.address,
        v_account.city,
        v_account.state,
        v_account.zip,
        v_account.user_id,
        v_account.email_address,
        v_account.phone,
        v_account.mobile_phone,
        v_account.requires_password_change,
        (v_account.account_number = 99),
        FALSE, -- doesn't need password initialization
        FALSE; -- 2FA complete
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION generate_2fa_code TO authenticated;
GRANT EXECUTE ON FUNCTION generate_2fa_code TO anon;
GRANT EXECUTE ON FUNCTION validate_2fa_code TO authenticated;
GRANT EXECUTE ON FUNCTION validate_2fa_code TO anon;