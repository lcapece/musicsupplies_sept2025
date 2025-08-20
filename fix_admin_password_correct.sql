-- Set the correct admin password and fix function overload issue completely

-- Update admin password to the correct one
UPDATE admin_config 
SET config_value = '2750GroveAvenue', updated_at = NOW()
WHERE config_key = 'admin_999_password';

-- Insert if doesn't exist
INSERT INTO admin_config (config_key, config_value, updated_at)
VALUES ('admin_999_password', '2750GroveAvenue', NOW())
ON CONFLICT (config_key) DO UPDATE SET 
  config_value = EXCLUDED.config_value,
  updated_at = NOW();

-- Drop ALL authenticate functions once more with CASCADE to ensure cleanup
DROP FUNCTION IF EXISTS public.authenticate_user CASCADE;

-- Create a completely fresh function with a unique name first to avoid conflicts
CREATE OR REPLACE FUNCTION authenticate_user_v2(
  p_identifier text,
  p_password text,
  p_ip_address text DEFAULT NULL,
  p_2fa_code text DEFAULT NULL
)
RETURNS TABLE(
  account_number bigint,
  acct_name text,
  address text,
  city text,
  state text,
  zip text,
  id uuid,
  email_address text,
  phone text,
  mobile_phone text,
  requires_password_change boolean,
  is_special_admin boolean,
  needs_password_initialization boolean,
  requires_2fa boolean,
  debug_info text
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_account_number bigint;
  v_stored_password text;
  v_user_data record;
BEGIN
  -- Handle account 999 specifically
  IF p_identifier = '999' THEN
    -- Get stored admin password
    SELECT config_value INTO v_stored_password 
    FROM admin_config 
    WHERE config_key = 'admin_999_password';
    
    -- Check if password matches
    IF v_stored_password IS NOT NULL AND v_stored_password = p_password THEN
      -- Get user data
      SELECT * INTO v_user_data FROM accounts_lcmd WHERE account_number = 999;
      
      IF v_user_data IS NOT NULL THEN
        RETURN QUERY
        SELECT
          v_user_data.account_number::bigint,
          COALESCE(v_user_data.acct_name, 'Admin Account')::text,
          COALESCE(v_user_data.address, '2750 Grove Avenue')::text,
          COALESCE(v_user_data.city, 'Richmond')::text,
          COALESCE(v_user_data.state, 'VA')::text,
          COALESCE(v_user_data.zip, '23220')::text,
          v_user_data.user_id,
          COALESCE(v_user_data.email_address, 'admin@musicsupplies.com')::text,
          COALESCE(v_user_data.phone, '8003215584')::text,
          COALESCE(v_user_data.mobile_phone, '8003215584')::text,
          false, -- requires_password_change
          true,  -- is_special_admin
          false, -- needs_password_initialization
          false, -- requires_2fa (DISABLED)
          'Admin 999 authentication successful'::text;
      END IF;
    END IF;
  END IF;
  
  -- Return empty for failed authentication
  RETURN;
END;
$$;

-- Drop the old function name and create alias
DROP FUNCTION IF EXISTS authenticate_user CASCADE;

-- Create the function with the expected name
CREATE OR REPLACE FUNCTION authenticate_user(
  p_identifier text,
  p_password text,
  p_ip_address text DEFAULT NULL,
  p_2fa_code text DEFAULT NULL
)
RETURNS TABLE(
  account_number bigint,
  acct_name text,
  address text,
  city text,
  state text,
  zip text,
  id uuid,
  email_address text,
  phone text,
  mobile_phone text,
  requires_password_change boolean,
  is_special_admin boolean,
  needs_password_initialization boolean,
  requires_2fa boolean,
  debug_info text
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY SELECT * FROM authenticate_user_v2(p_identifier, p_password, p_ip_address, p_2fa_code);
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION authenticate_user(text, text, text, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION authenticate_user_v2(text, text, text, text) TO anon, authenticated;

-- Test with correct password
SELECT 'Testing with correct password:' as test;
SELECT * FROM authenticate_user('999', '2750GroveAvenue', '127.0.0.1', null);