-- Setup ClickSend credentials in app_config table
-- You need to get ClickSend credentials from https://clicksend.com

INSERT INTO app_config (config_key, config_value, decrypted_value, encrypted)
VALUES 
    ('CLICKSEND_USERNAME', 'PLACEHOLDER', 'PLACEHOLDER', false),
    ('CLICKSEND_API_KEY', 'PLACEHOLDER', 'PLACEHOLDER', false)
ON CONFLICT (config_key) 
DO UPDATE SET 
    config_value = EXCLUDED.config_value,
    decrypted_value = EXCLUDED.decrypted_value,
    updated_at = NOW();

-- Create app_config table if it doesn't exist
CREATE TABLE IF NOT EXISTS app_config (
    id SERIAL PRIMARY KEY,
    config_key VARCHAR(255) UNIQUE NOT NULL,
    config_value TEXT,
    decrypted_value TEXT,
    encrypted BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

GRANT SELECT ON app_config TO authenticated, anon;