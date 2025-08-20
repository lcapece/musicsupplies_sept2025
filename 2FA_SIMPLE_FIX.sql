-- Simple 2FA fix - logs the code for local testing
-- In production, you'll integrate with your existing SMS system

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
    
    -- Log the SMS codes (for local testing - in production, call your SMS API here)
    IF v_phone_numbers IS NOT NULL THEN
        FOREACH v_phone IN ARRAY v_phone_numbers
        LOOP
            -- Log to app_events table for visibility
            INSERT INTO app_events (event_type, event_name, event_data)
            VALUES ('2FA_CODE_GENERATED', 'Test Mode', jsonb_build_object(
                'phone', v_phone,
                'code', v_code,
                'account', p_account_number,
                'expires_at', v_expires_at,
                'message', 'SMS CODE: ' || v_code || ' (expires in 90 seconds)'
            ));
            
            -- Also raise a notice so you can see it in console
            RAISE NOTICE '2FA SMS to %: Code is % (expires at %)', v_phone, v_code, v_expires_at;
        END LOOP;
    END IF;
    
    -- Return success with the code visible for testing
    RETURN json_build_object(
        'success', true, 
        'message', 'TEST MODE: 2FA code is ' || v_code,
        'code', v_code,  -- Remove this line in production!
        'expires_at', v_expires_at
    );
END;
$$;