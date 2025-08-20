-- Update 2FA to use ClickSend SMS
-- This replaces the placeholder with actual SMS sending

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
    v_clicksend_response TEXT;
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
    
    -- Send SMS via ClickSend to each phone number
    IF v_phone_numbers IS NOT NULL THEN
        FOREACH v_phone IN ARRAY v_phone_numbers
        LOOP
            -- Call the send_clicksend_sms function
            SELECT send_clicksend_sms(
                v_phone,
                'Music Supplies Security Code: ' || v_code || ' (expires in 90 seconds)',
                'MusicSupply'
            ) INTO v_clicksend_response;
            
            -- Log the SMS send
            INSERT INTO app_events (event_type, event_name, event_data)
            VALUES ('2FA_SMS_SENT', 'ClickSend SMS', jsonb_build_object(
                'phone', v_phone,
                'code', v_code,
                'account', p_account_number,
                'expires_at', v_expires_at,
                'response', v_clicksend_response
            ));
        END LOOP;
    END IF;
    
    RETURN json_build_object(
        'success', true, 
        'message', '2FA code sent via SMS',
        'expires_at', v_expires_at
    );
END;
$$;

-- Create the ClickSend SMS sending function
CREATE OR REPLACE FUNCTION send_clicksend_sms(
    p_to_number TEXT,
    p_message TEXT,
    p_from_name TEXT DEFAULT 'MusicSupply'
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_response JSON;
    v_clicksend_username TEXT;
    v_clicksend_api_key TEXT;
BEGIN
    -- Get ClickSend credentials from environment or config table
    -- You should store these securely in a config table or environment variables
    SELECT 
        decrypted_value INTO v_clicksend_username
    FROM 
        app_config 
    WHERE 
        config_key = 'CLICKSEND_USERNAME';
        
    SELECT 
        decrypted_value INTO v_clicksend_api_key
    FROM 
        app_config 
    WHERE 
        config_key = 'CLICKSEND_API_KEY';
    
    -- Make HTTP request to ClickSend API
    -- Using pg_net extension (needs to be enabled in Supabase)
    SELECT net.http_post(
        url := 'https://rest.clicksend.com/v3/sms/send',
        headers := jsonb_build_object(
            'Authorization', 'Basic ' || encode((v_clicksend_username || ':' || v_clicksend_api_key)::bytea, 'base64'),
            'Content-Type', 'application/json'
        ),
        body := jsonb_build_object(
            'messages', jsonb_build_array(
                jsonb_build_object(
                    'to', p_to_number,
                    'body', p_message,
                    'from', p_from_name
                )
            )
        )
    ) INTO v_response;
    
    RETURN v_response;
EXCEPTION
    WHEN OTHERS THEN
        -- Log error but don't block login
        INSERT INTO app_events (event_type, event_name, event_data)
        VALUES ('SMS_ERROR', 'ClickSend Failed', jsonb_build_object(
            'error', SQLERRM,
            'phone', p_to_number
        ));
        RETURN json_build_object('error', SQLERRM);
END;
$$;

-- Create config table for API credentials if it doesn't exist
CREATE TABLE IF NOT EXISTS app_config (
    config_key TEXT PRIMARY KEY,
    encrypted_value TEXT,
    decrypted_value TEXT, -- In production, use proper encryption
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Insert ClickSend credentials (YOU NEED TO UPDATE THESE WITH YOUR ACTUAL CREDENTIALS)
INSERT INTO app_config (config_key, decrypted_value) 
VALUES 
    ('CLICKSEND_USERNAME', 'YOUR_CLICKSEND_USERNAME'),
    ('CLICKSEND_API_KEY', 'YOUR_CLICKSEND_API_KEY')
ON CONFLICT (config_key) DO UPDATE 
SET decrypted_value = EXCLUDED.decrypted_value,
    updated_at = NOW();