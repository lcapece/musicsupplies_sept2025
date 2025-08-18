/*
  # CHECK WHAT AUTHENTICATION ACTUALLY EXISTS
  
  This will show us what's REALLY in the database
*/

-- List ALL functions that could be authenticating
CREATE OR REPLACE FUNCTION list_all_auth_functions()
RETURNS TABLE(
  function_name text,
  arguments text,
  created timestamp
)
LANGUAGE sql
AS $$
  SELECT 
    proname::text as function_name,
    pg_get_function_arguments(oid)::text as arguments,
    NOW() as created
  FROM pg_proc
  WHERE proname LIKE '%auth%' 
     OR proname LIKE '%login%'
     OR proname LIKE '%password%'
     OR proname = 'authenticate_user_v5'
  ORDER BY proname;
$$;

-- Check what authenticate_user_v5 ACTUALLY does
CREATE OR REPLACE FUNCTION check_music123_works()
RETURNS TABLE(
  test_name text,
  result text
)
LANGUAGE plpgsql
AS $$
DECLARE
  v_result RECORD;
BEGIN
  -- Test 1: Try Music123
  BEGIN
    SELECT * INTO v_result FROM authenticate_user_v5('999', 'Music123', 'test');
    IF v_result.account_number IS NOT NULL THEN
      RETURN QUERY SELECT 'Music123 Test'::text, 'DANGER: MUSIC123 WORKS!'::text;
    ELSE
      RETURN QUERY SELECT 'Music123 Test'::text, 'Good: Music123 blocked'::text;
    END IF;
  EXCEPTION WHEN OTHERS THEN
    RETURN QUERY SELECT 'Music123 Test'::text, 'Error: ' || SQLERRM::text;
  END;
  
  -- Test 2: Try 2750grove
  BEGIN
    SELECT * INTO v_result FROM authenticate_user_v5('999', '2750grove', 'test');
    IF v_result.account_number IS NOT NULL THEN
      RETURN QUERY SELECT '2750grove Test'::text, 'Good: 2750grove works'::text;
    ELSE
      RETURN QUERY SELECT '2750grove Test'::text, 'Bad: 2750grove blocked'::text;
    END IF;
  EXCEPTION WHEN OTHERS THEN
    RETURN QUERY SELECT '2750grove Test'::text, 'Error: ' || SQLERRM::text;
  END;
  
  -- Test 3: Check if there's a pwd table
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'pwd') THEN
    RETURN QUERY SELECT 'PWD Table'::text, 'DANGER: PWD table exists!'::text;
  ELSE
    RETURN QUERY SELECT 'PWD Table'::text, 'Good: No pwd table'::text;
  END IF;
  
  -- Test 4: Check user_passwords for 999
  IF EXISTS (SELECT 1 FROM user_passwords WHERE account_number = 999) THEN
    RETURN QUERY SELECT 'Account 999 Password'::text, 'Password exists for 999'::text;
  ELSE
    RETURN QUERY SELECT 'Account 999 Password'::text, 'No password for 999!'::text;
  END IF;
END;
$$;

-- Run the checks
SELECT * FROM list_all_auth_functions();
SELECT * FROM check_music123_works();

-- Check the ACTUAL source code of authenticate_user_v5
SELECT 
  proname as function_name,
  prosrc as source_code
FROM pg_proc 
WHERE proname = 'authenticate_user_v5'
LIMIT 1;