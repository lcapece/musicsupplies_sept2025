-- CREATE authenticate_user_v6 IMMEDIATELY!

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
  -- BLOCK Music123
  IF lower(p_password) LIKE '%music%' OR p_password LIKE '%123%' THEN
    RETURN; -- Return empty
  END IF;

  -- HARDCODED: Allow 999/2750grove
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
      'Hardcoded backend admin'::text;
    RETURN;
  END IF;

  -- For other accounts, call v5 if it exists
  RETURN QUERY SELECT * FROM authenticate_user_v5(p_identifier, p_password, p_ip_address);
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION authenticate_user_v6 TO anon, authenticated, service_role;

-- Test it
SELECT * FROM authenticate_user_v6('999', '2750grove', 'CREATE_TEST');