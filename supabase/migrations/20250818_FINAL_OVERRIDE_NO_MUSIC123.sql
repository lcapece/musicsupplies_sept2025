/*
  # FINAL OVERRIDE - NO MUSIC123 UNDER ANY CIRCUMSTANCES
  
  This migration:
  1. Drops ALL authentication functions
  2. Creates ONE function that ONLY accepts 2750grove
  3. Any string containing "music" or "123" is rejected
*/

-- First, drop EVERYTHING
DROP FUNCTION IF EXISTS authenticate_user CASCADE;
DROP FUNCTION IF EXISTS authenticate_user_v2 CASCADE;
DROP FUNCTION IF EXISTS authenticate_user_v3 CASCADE;
DROP FUNCTION IF EXISTS authenticate_user_v4 CASCADE;
DROP FUNCTION IF EXISTS authenticate_user_v5 CASCADE;
DROP FUNCTION IF EXISTS authenticate_user_v6 CASCADE;
DROP FUNCTION IF EXISTS authenticate_user_lcmd CASCADE;

-- Create the ONLY authentication function
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
SET search_path = public
AS $$
BEGIN
  -- LOG EVERY ATTEMPT
  INSERT INTO app_events (event_type, event_name, event_data)
  VALUES (
    'AUTH_ATTEMPT',
    'Login attempt',
    jsonb_build_object(
      'identifier', p_identifier,
      'password_length', length(p_password),
      'ip', p_ip_address,
      'contains_music', CASE WHEN lower(p_password) LIKE '%music%' THEN true ELSE false END,
      'contains_123', CASE WHEN p_password LIKE '%123%' THEN true ELSE false END
    )
  );

  -- ABSOLUTE BLOCK ON MUSIC123
  IF lower(p_password) LIKE '%music%' OR p_password LIKE '%123%' THEN
    -- Log the violation
    INSERT INTO app_events (event_type, event_name, event_data)
    VALUES (
      'SECURITY_VIOLATION',
      'Music123 attempt blocked',
      jsonb_build_object(
        'identifier', p_identifier,
        'password', p_password,
        'ip', p_ip_address
      )
    );
    
    -- Return empty result (authentication failed)
    RETURN;
  END IF;

  -- ONLY allow 999/2750grove - NOTHING ELSE
  IF p_identifier = '999' AND p_password = '2750grove' THEN
    RETURN QUERY SELECT
      999::bigint,
      'Backend Admin'::text,
      '2750 Grove'::text,
      'Admin'::text,
      'NY'::text,
      '11111'::text,
      gen_random_uuid(),
      'admin@musicsupplies.com'::text,
      '516-410-7455'::text,
      '516-410-7455'::text,
      false,
      true,
      false,
      'Authenticated successfully with 2750grove'::text;
  END IF;

  -- Everything else fails
  RETURN;
END;
$$;

-- Also create v6 as an alias to v5
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
  -- Just call v5
  RETURN QUERY SELECT * FROM authenticate_user_v5(p_identifier, p_password, p_ip_address);
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION authenticate_user_v5 TO anon;
GRANT EXECUTE ON FUNCTION authenticate_user_v6 TO anon;

-- Test to ensure it works correctly
DO $$
DECLARE
  v_result RECORD;
BEGIN
  -- Test Music123 - should fail
  SELECT * INTO v_result FROM authenticate_user_v5('999', 'Music123', 'migration_test');
  IF v_result.account_number IS NOT NULL THEN
    RAISE EXCEPTION 'CRITICAL ERROR: Music123 still works!';
  END IF;
  
  -- Test 2750grove - should work
  SELECT * INTO v_result FROM authenticate_user_v5('999', '2750grove', 'migration_test');
  IF v_result.account_number IS NULL THEN
    RAISE EXCEPTION 'ERROR: 2750grove does not work!';
  END IF;
  
  RAISE NOTICE 'SUCCESS: Authentication function replaced. Only 2750grove works.';
END $$;