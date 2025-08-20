-- URGENT: Fix admin password mismatch
-- Database has '2750grove' but system expects '2750GroveAvenue'

-- Update admin_config to have the correct password
UPDATE admin_config 
SET config_value = '2750GroveAvenue'
WHERE config_key = 'admin_999_password';

-- If the record doesn't exist, insert it
INSERT INTO admin_config (config_key, config_value, description)
VALUES ('admin_999_password', '2750GroveAvenue', 'Admin account 999 password')
ON CONFLICT (config_key) 
DO UPDATE SET config_value = '2750GroveAvenue';

-- Verify the update
SELECT config_key, config_value FROM admin_config WHERE config_key = 'admin_999_password';