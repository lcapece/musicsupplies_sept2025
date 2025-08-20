-- Fix permissions for validate_admin_password function
-- The login screen uses anonymous user, not authenticated user
-- So we need to grant the function to anon for the 999 login to work

-- Grant the validation function to anonymous users (needed for login)
GRANT EXECUTE ON FUNCTION validate_admin_password(TEXT) TO anon;

-- Update RLS policy to allow anonymous access for validation only
DROP POLICY IF EXISTS "Admin config access" ON admin_config;

-- Create more restrictive policies
CREATE POLICY "Admin config read for validation" ON admin_config
  FOR SELECT TO anon
  USING (config_key = 'admin_999_password');

CREATE POLICY "Admin config full access" ON admin_config  
  FOR ALL TO authenticated
  USING (true);

COMMENT ON FUNCTION validate_admin_password IS 'Validates admin password - accessible to anonymous users for login purposes';