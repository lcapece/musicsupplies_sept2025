-- Update admin password back to '2750GroveAvenue' for account 999
UPDATE admin_config 
SET config_value = '2750GroveAvenue', 
    updated_at = TIMEZONE('utc', NOW()),
    updated_by = 'user_request'
WHERE config_key = 'admin_999_password';

-- Verify the update worked
SELECT config_key, config_value, updated_at, updated_by 
FROM admin_config 
WHERE config_key = 'admin_999_password';