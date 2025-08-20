-- Emergency fix: Update admin password to 'devil' for account 999 login
UPDATE admin_config 
SET config_value = 'devil', 
    updated_at = TIMEZONE('utc', NOW()),
    updated_by = 'emergency_fix'
WHERE config_key = 'admin_999_password';

-- Verify the update worked
SELECT config_key, config_value, updated_at, updated_by 
FROM admin_config 
WHERE config_key = 'admin_999_password';