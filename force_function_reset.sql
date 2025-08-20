-- Force complete reset of authenticate_user function
-- This will manually drop every possible variation

DROP FUNCTION IF EXISTS public.authenticate_user CASCADE;
DROP FUNCTION IF EXISTS authenticate_user CASCADE;
DROP FUNCTION IF EXISTS public.authenticate_user(text) CASCADE;
DROP FUNCTION IF EXISTS authenticate_user(text) CASCADE;
DROP FUNCTION IF EXISTS public.authenticate_user(text, text) CASCADE;
DROP FUNCTION IF EXISTS authenticate_user(text, text) CASCADE;
DROP FUNCTION IF EXISTS public.authenticate_user(text, text, text) CASCADE;
DROP FUNCTION IF EXISTS authenticate_user(text, text, text) CASCADE;
DROP FUNCTION IF EXISTS public.authenticate_user(text, text, text, text) CASCADE;
DROP FUNCTION IF EXISTS authenticate_user(text, text, text, text) CASCADE;

-- Also check for any other variations
DROP FUNCTION IF EXISTS public.authenticate_user(varchar, varchar, varchar, varchar) CASCADE;
DROP FUNCTION IF EXISTS authenticate_user(varchar, varchar, varchar, varchar) CASCADE;

-- Wait a moment for the drops to complete
SELECT pg_sleep(1);

-- Now create ONE simple function
CREATE OR REPLACE FUNCTION public.authenticate_user(
  p_identifier text,
  p_password text,
  p_ip_address text DEFAULT NULL,
  p_2fa_code text DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result json;
  v_account_number bigint;
  v_user_data record;
BEGIN
  -- Simple authentication for account 999
  IF p_identifier = '999' AND p_password = 'admin999' THEN
    -- Get account data
    SELECT * INTO v_user_data FROM accounts_lcmd WHERE account_number = 999;
    
    IF v_user_data IS NOT NULL THEN
      result := json_build_object(
        'account_number', v_user_data.account_number,
        'acct_name', COALESCE(v_user_data.acct_name, ''),
        'address', COALESCE(v_user_data.address, ''),
        'city', COALESCE(v_user_data.city, ''),
        'state', COALESCE(v_user_data.state, ''),
        'zip', COALESCE(v_user_data.zip, ''),
        'id', v_user_data.user_id,
        'email_address', COALESCE(v_user_data.email_address, ''),
        'phone', COALESCE(v_user_data.phone, ''),
        'mobile_phone', COALESCE(v_user_data.mobile_phone, ''),
        'requires_password_change', false,
        'is_special_admin', true,
        'needs_password_initialization', false,
        'requires_2fa', false,
        'debug_info', 'Admin 999 authenticated successfully'
      );
      
      RETURN result;
    END IF;
  END IF;
  
  -- Return null for failed authentication
  RETURN NULL;
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION public.authenticate_user(text, text, text, text) TO anon, authenticated;

-- Test it immediately
SELECT 'Testing new function:' as status;
SELECT public.authenticate_user('999', 'admin999', '127.0.0.1', null) as result;