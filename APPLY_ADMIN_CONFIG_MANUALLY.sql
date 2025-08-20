-- URGENT: Run this SQL in your Supabase dashboard to fix 999 login
-- Go to: https://supabase.com/dashboard/project/[your-project]/sql
-- Paste this entire SQL and click "Run"

-- 1. Create admin configuration table for storing admin passwords
CREATE TABLE IF NOT EXISTS admin_config (
  id SERIAL PRIMARY KEY,
  config_key VARCHAR(100) UNIQUE NOT NULL,
  config_value TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  updated_by VARCHAR(50)
);

-- 2. Insert the admin password (change this if needed)
INSERT INTO admin_config (config_key, config_value, description, updated_by) VALUES
('admin_999_password', '2750GroveAvenue', 'Password for admin account 999', 'system')
ON CONFLICT (config_key) DO UPDATE SET 
  config_value = EXCLUDED.config_value,
  updated_at = TIMEZONE('utc', NOW()),
  updated_by = EXCLUDED.updated_by;

-- 3. Create function to validate admin password
CREATE OR REPLACE FUNCTION validate_admin_password(p_password TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM admin_config 
    WHERE config_key = 'admin_999_password' 
    AND config_value = p_password
  );
END;
$$;

-- 4. Create function to update admin password
CREATE OR REPLACE FUNCTION update_admin_password(p_new_password TEXT, p_updated_by TEXT DEFAULT 'admin')
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE admin_config 
  SET config_value = p_new_password, 
      updated_at = TIMEZONE('utc', NOW()),
      updated_by = p_updated_by
  WHERE config_key = 'admin_999_password';
  
  RETURN FOUND;
END;
$$;

-- 5. Create function to get admin password (for backend management)
CREATE OR REPLACE FUNCTION get_admin_password()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  admin_password TEXT;
BEGIN
  SELECT config_value INTO admin_password
  FROM admin_config 
  WHERE config_key = 'admin_999_password';
  
  RETURN admin_password;
END;
$$;

-- 6. Grant permissions to both authenticated AND anonymous users
GRANT SELECT ON admin_config TO authenticated;
GRANT EXECUTE ON FUNCTION validate_admin_password(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION update_admin_password(TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION get_admin_password() TO authenticated;

-- CRITICAL: Grant to anonymous users for login
GRANT EXECUTE ON FUNCTION validate_admin_password(TEXT) TO anon;

-- 7. Enable RLS
ALTER TABLE admin_config ENABLE ROW LEVEL SECURITY;

-- 8. Create RLS policies
DROP POLICY IF EXISTS "Admin config access" ON admin_config;
DROP POLICY IF EXISTS "Admin config read for validation" ON admin_config;
DROP POLICY IF EXISTS "Admin config full access" ON admin_config;

-- Allow anonymous access for password validation only
CREATE POLICY "Admin config read for validation" ON admin_config
  FOR SELECT TO anon
  USING (config_key = 'admin_999_password');

-- Allow authenticated users full access  
CREATE POLICY "Admin config full access" ON admin_config  
  FOR ALL TO authenticated
  USING (true);

-- 9. Add comments
COMMENT ON TABLE admin_config IS 'Secure storage for admin passwords and configuration settings';
COMMENT ON FUNCTION validate_admin_password IS 'Validates admin password - accessible to anonymous users for login purposes';

-- 10. Test the function works
SELECT validate_admin_password('2750GroveAvenue') as password_test;
-- This should return TRUE