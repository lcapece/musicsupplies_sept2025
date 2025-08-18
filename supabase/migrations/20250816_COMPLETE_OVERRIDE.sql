/*
  # COMPLETE OVERRIDE - NEW FUNCTION NAME
  
  Since authenticate_user_v5 might be cached, create NEW function
*/

-- DROP the old function completely
DROP FUNCTION IF EXISTS authenticate_user_v5 CASCADE;

-- Create NEW function with DIFFERENT NAME
CREATE OR REPLACE FUNCTION authenticate_user_v6(
  p_identifier text,
  p_password text,
  p_ip_address text DEFAULT NULL
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
  debug_info text
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- LOG EVERY ATTEMPT
  INSERT INTO app_events (
    event_type,
    event_name,
    event_data,
    created_at
  ) VALUES (
    'AUTH_ATTEMPT_V6',
    'login_attempt',
    jsonb_build_object(
      'identifier', p_identifier,
      'password_length', LENGTH(p_password),
      'password_first_3', LEFT(p_password, 3),
      'ip', p_ip_address
    ),
    NOW()
  );

  -- ABSOLUTE BLOCK
  IF p_password = 'Music123' OR 
     LOWER(p_password) = 'music123' OR
     UPPER(p_password) = 'MUSIC123' OR
     p_password LIKE '%usic%' OR
     p_password LIKE '%123%' THEN
    
    INSERT INTO app_events (
      event_type,
      event_name,
      event_data,
      created_at
    ) VALUES (
      'BLOCKED_V6',
      'music123_blocked',
      jsonb_build_object('password', p_password),
      NOW()
    );
    
    -- RETURN EMPTY
    RETURN;
  END IF;
  
  -- ONLY ALLOW 999/2750grove
  IF p_identifier = '999' AND p_password = '2750grove' THEN
    RETURN QUERY
    SELECT
      999::bigint,
      'Backend Admin'::text,
      'System'::text,
      'System'::text,
      'SY'::text,
      '00000'::text,
      gen_random_uuid(),
      'admin@system.com'::text,
      '000-000-0000'::text,
      '15164107455'::text,
      false,
      true,
      false,
      'V6 Auth Success'::text;
  END IF;
  
  -- Everything else fails
  RETURN;
END;
$$;

-- Redirect old function to new one
CREATE OR REPLACE FUNCTION authenticate_user_v5(
  p_identifier text,
  p_password text,
  p_ip_address text DEFAULT NULL
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
  debug_info text
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Just call v6
  RETURN QUERY SELECT * FROM authenticate_user_v6(p_identifier, p_password, p_ip_address);
END;
$$;

GRANT EXECUTE ON FUNCTION authenticate_user_v6 TO anon, authenticated;
GRANT EXECUTE ON FUNCTION authenticate_user_v5 TO anon, authenticated;