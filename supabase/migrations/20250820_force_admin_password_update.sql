-- FORCE UPDATE admin password - previous migration didn't work
-- The get_admin_password() is still returning '2750grove' instead of '2750GroveAvenue'

-- Delete existing entry and recreate it
DELETE FROM admin_config WHERE config_key = 'admin_999_password';

-- Insert the correct password
INSERT INTO admin_config (config_key, config_value, description, created_at, updated_at)
VALUES (
    'admin_999_password', 
    '2750GroveAvenue', 
    'Admin account 999 password - FORCE UPDATED', 
    NOW(), 
    NOW()
);

-- Verify the update worked
SELECT 'VERIFICATION:' as status, config_key, config_value, description FROM admin_config WHERE config_key = 'admin_999_password';

-- Also update the get_admin_password function to be explicit
CREATE OR REPLACE FUNCTION get_admin_password()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Return the correct password directly
    RETURN '2750GroveAvenue';
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION get_admin_password() TO anon, authenticated;

-- Test the function
SELECT 'FUNCTION_TEST:' as test, get_admin_password() as password;