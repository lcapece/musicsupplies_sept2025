-- Grant permissions for admin functions to anonymous users (needed for login)
GRANT EXECUTE ON FUNCTION get_admin_password() TO anon;
GRANT EXECUTE ON FUNCTION validate_admin_password(TEXT) TO anon;

-- Also ensure admin_config table can be accessed by anon users for authentication
CREATE POLICY IF NOT EXISTS "Allow anon access for admin auth" ON admin_config
  FOR SELECT TO anon
  USING (config_key = 'admin_999_password');

-- Comment to verify this is working
SELECT 'Admin function permissions granted to anonymous users for authentication';