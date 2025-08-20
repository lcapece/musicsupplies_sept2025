-- Fix admin password mismatch - update to expected value
-- Database currently has '2750grove' but system expects '2750GroveAvenue'

-- Ensure admin_config table exists
CREATE TABLE IF NOT EXISTS admin_config (
    id SERIAL PRIMARY KEY,
    config_key VARCHAR(255) UNIQUE NOT NULL,
    config_value TEXT,
    description TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Update admin password to match what the system expects
INSERT INTO admin_config (config_key, config_value, description)
VALUES ('admin_999_password', '2750GroveAvenue', 'Admin account 999 password - updated for 2FA compatibility')
ON CONFLICT (config_key) 
DO UPDATE SET 
    config_value = '2750GroveAvenue',
    description = 'Admin account 999 password - updated for 2FA compatibility',
    updated_at = NOW();

-- Grant permissions
GRANT SELECT ON admin_config TO authenticated, anon;