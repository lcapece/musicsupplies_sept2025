-- Create admin configuration table for storing admin passwords and settings
CREATE TABLE IF NOT EXISTS admin_config (
  id SERIAL PRIMARY KEY,
  config_key VARCHAR(100) UNIQUE NOT NULL,
  config_value TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  updated_by VARCHAR(50)
);

-- Insert the admin password
INSERT INTO admin_config (config_key, config_value, description, updated_by) VALUES
('admin_999_password', '2750GroveAvenue', 'Password for admin account 999', 'system');

-- Create function to validate admin password
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

-- Create function to update admin password
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

-- Create function to get admin password (for backend management)
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

-- Grant permissions (only to authenticated users, not anonymous)
GRANT SELECT ON admin_config TO authenticated;
GRANT EXECUTE ON FUNCTION validate_admin_password(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION update_admin_password(TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION get_admin_password() TO authenticated;

-- Enable RLS
ALTER TABLE admin_config ENABLE ROW LEVEL SECURITY;

-- Create RLS policy - only allow access to authenticated users
CREATE POLICY "Admin config access" ON admin_config
  FOR ALL TO authenticated
  USING (true);

COMMENT ON TABLE admin_config IS 'Secure storage for admin passwords and configuration settings';