-- Update admin password to 'devil' for account 999
UPDATE admin_config 
SET config_value = 'devil', 
    updated_at = TIMEZONE('utc', NOW()),
    updated_by = 'emergency_fix'
WHERE config_key = 'admin_999_password';

-- Also check if accounts_lcmd table has proper structure
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'accounts_lcmd' 
  AND table_schema = 'public';

-- Check RLS policies on accounts_lcmd
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies 
WHERE tablename = 'accounts_lcmd';