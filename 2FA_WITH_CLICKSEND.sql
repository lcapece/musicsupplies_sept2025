-- 2FA with ClickSend SMS integration using existing Edge Function
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
    v_sms_result JSON;
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
    
    -- Send SMS via Edge Function
    IF v_phone_numbers IS NOT NULL AND array_length(v_phone_numbers, 1) > 0 THEN
        -- Call the Edge Function to send SMS
        SELECT 
            net.http_post(
                url := current_setting('app.supabase_url') || '/functions/v1/send-admin-sms',
                headers := jsonb_build_object(
                    'Authorization', 'Bearer ' || current_setting('app.supabase_anon_key'),
                    'Content-Type', 'application/json'
                ),
                body := jsonb_build_object(
                    'eventName', '2FA_LOGIN',
                    'message', 'Music Supplies Admin Security Code: ' || v_code || ' (expires in 90 seconds)',
                    'customPhones', v_phone_numbers,
                    'additionalData', jsonb_build_object(
                        'account', p_account_number,
                        'ip_address', p_ip_address
                    )
                )
            )::json INTO v_sms_result;
        
        -- Log the SMS send
        INSERT INTO app_events (event_type, event_name, event_data)
        VALUES ('2FA_SMS_SENT', 'ClickSend Edge Function', jsonb_build_object(
            'phones', v_phone_numbers,
            'code', v_code,
            'account', p_account_number,
            'expires_at', v_expires_at,
            'sms_result', v_sms_result
        ));
    END IF;
    
    RETURN json_build_object(
        'success', true, 
        'message', '2FA code sent to authorized numbers',
        'expires_at', v_expires_at
    );
END;
$$;

-- Since net.http_post might not be available, here's an alternative that uses Supabase's invoke function
CREATE OR REPLACE FUNCTION generate_2fa_code_v2(
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
    
    -- Queue SMS for sending (will be picked up by process-sms-queue Edge Function)
    IF v_phone_numbers IS NOT NULL AND array_length(v_phone_numbers, 1) > 0 THEN
        -- Insert SMS messages into a queue table for processing
        INSERT INTO sms_queue (
            phone_number,
            message,
            event_type,
            priority,
            metadata
        )
        SELECT 
            unnest(v_phone_numbers),
            'Music Supplies Admin Security Code: ' || v_code || ' (expires in 90 seconds)',
            '2FA_LOGIN',
            1, -- High priority
            jsonb_build_object(
                'account', p_account_number,
                'code', v_code,
                'expires_at', v_expires_at,
                'ip_address', p_ip_address
            );
        
        -- Log the SMS queue
        INSERT INTO app_events (event_type, event_name, event_data)
        VALUES ('2FA_SMS_QUEUED', 'SMS Queue', jsonb_build_object(
            'phones', v_phone_numbers,
            'code', v_code,
            'account', p_account_number,
            'expires_at', v_expires_at
        ));
    END IF;
    
    RETURN json_build_object(
        'success', true, 
        'message', '2FA code sent to authorized numbers',
        'expires_at', v_expires_at
    );
END;
$$;

-- Create SMS queue table if it doesn't exist
CREATE TABLE IF NOT EXISTS sms_queue (
    id SERIAL PRIMARY KEY,
    phone_number TEXT NOT NULL,
    message TEXT NOT NULL,
    event_type TEXT,
    priority INTEGER DEFAULT 5,
    metadata JSONB,
    status TEXT DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT NOW(),
    sent_at TIMESTAMP,
    error_message TEXT
);

-- Index for efficient queue processing
CREATE INDEX IF NOT EXISTS idx_sms_queue_status ON sms_queue(status, priority, created_at);

-- Use v2 as the main function
DROP FUNCTION IF EXISTS generate_2fa_code CASCADE;
ALTER FUNCTION generate_2fa_code_v2 RENAME TO generate_2fa_code;