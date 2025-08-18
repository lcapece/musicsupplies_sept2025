/*
  # FIND THE BREACH - Check EVERYTHING in database
*/

-- Check ALL functions that exist
SELECT 
  proname as function_name,
  proargnames as arguments,
  prosrc as source_code
FROM pg_proc 
WHERE pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
  AND (
    proname LIKE '%auth%' OR
    proname LIKE '%login%' OR
    proname LIKE '%password%'
  );

-- Check if there's a DEFAULT password somewhere
SELECT 
  column_name,
  column_default,
  table_name
FROM information_schema.columns
WHERE table_schema = 'public'
  AND column_default IS NOT NULL
  AND (
    column_name LIKE '%password%' OR
    column_default LIKE '%Music%' OR
    column_default LIKE '%123%'
  );

-- Check the accounts_lcmd table for account 999
SELECT 
  account_number,
  acct_name,
  email_address,
  password,
  requires_password_change,
  is_special_admin
FROM accounts_lcmd
WHERE account_number = 999;

-- Check user_passwords table
SELECT 
  account_number,
  password_hash,
  LENGTH(password_hash) as hash_length,
  LEFT(password_hash, 20) as hash_preview
FROM user_passwords
WHERE account_number = 999;

-- Check if password_hash matches Music123
SELECT 
  account_number,
  CASE 
    WHEN password_hash = 'Music123' THEN 'DANGER: Plain text Music123!'
    WHEN password_hash = crypt('Music123', password_hash) THEN 'DANGER: Music123 works!'
    ELSE 'Safe: Music123 blocked'
  END as status
FROM user_passwords
WHERE account_number = 999;

-- Check for ANY table with Music123
DO $$
DECLARE
  tbl text;
  col text;
  query text;
  found_count int;
BEGIN
  FOR tbl IN 
    SELECT tablename FROM pg_tables WHERE schemaname = 'public'
  LOOP
    FOR col IN 
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = tbl 
        AND data_type IN ('text', 'character varying', 'character')
    LOOP
      query := format('SELECT COUNT(*) FROM %I WHERE %I LIKE ''%%Music123%%''', tbl, col);
      EXECUTE query INTO found_count;
      IF found_count > 0 THEN
        RAISE NOTICE 'FOUND Music123 in table % column %', tbl, col;
      END IF;
    END LOOP;
  END LOOP;
END $$;