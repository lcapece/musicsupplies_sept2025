-- Setup ClickSend credentials for 2FA SMS
-- Replace YOUR_USERNAME and YOUR_API_KEY with your actual ClickSend credentials

-- Create app_config table if it doesn't exist
CREATE TABLE IF NOT EXISTS app_config (
    id SERIAL PRIMARY KEY,
    config_key VARCHAR(255) UNIQUE NOT NULL,
    config_value TEXT,
    decrypted_value TEXT, -- This is what the SMS function looks for
    encrypted BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Insert ClickSend credentials
-- You need to replace 'YOUR_CLICKSEND_USERNAME' and 'YOUR_CLICKSEND_API_KEY' with real values
INSERT INTO app_config (config_key, config_value, decrypted_value)
VALUES 
    ('CLICKSEND_USERNAME', 'YOUR_CLICKSEND_USERNAME', 'YOUR_CLICKSEND_USERNAME'),
    ('CLICKSEND_API_KEY', 'YOUR_CLICKSEND_API_KEY', 'YOUR_CLICKSEND_API_KEY')
ON CONFLICT (config_key) 
DO UPDATE SET 
    config_value = EXCLUDED.config_value,
    decrypted_value = EXCLUDED.decrypted_value,
    updated_at = NOW();

-- Grant permissions
GRANT SELECT ON app_config TO authenticated, anon;