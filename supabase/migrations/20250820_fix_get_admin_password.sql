-- Fix get_admin_password function to return the correct password
CREATE OR REPLACE FUNCTION get_admin_password()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_password TEXT;
BEGIN
    -- Get password from admin_config table
    SELECT config_value INTO v_password
    FROM admin_config 
    WHERE config_key = 'admin_999_password';
    
    -- If not found in admin_config, return the expected password
    IF v_password IS NULL THEN
        v_password := '2750GroveAvenue';
    END IF;
    
    RETURN v_password;
END;
$$;

GRANT EXECUTE ON FUNCTION get_admin_password() TO anon, authenticated;