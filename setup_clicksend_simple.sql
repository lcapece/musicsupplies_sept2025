-- Simple ClickSend credential setup
-- Replace the values with your actual ClickSend credentials

UPDATE app_config 
SET 
    decrypted_value = 'YOUR_CLICKSEND_USERNAME',
    updated_at = NOW()
WHERE config_key = 'CLICKSEND_USERNAME';

UPDATE app_config 
SET 
    decrypted_value = 'YOUR_CLICKSEND_API_KEY',
    updated_at = NOW()
WHERE config_key = 'CLICKSEND_API_KEY';

-- Verify the updates
SELECT config_key, decrypted_value FROM app_config 
WHERE config_key IN ('CLICKSEND_USERNAME', 'CLICKSEND_API_KEY');