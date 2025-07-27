-- Migration to consolidate password logic into accounts_LCMD table
-- and remove logon_lcmd table.

-- Enable pgcrypto extension if not already enabled
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 1. Ensure necessary columns exist in accounts_LCMD
ALTER TABLE public.accounts_lcmd
ADD COLUMN IF NOT EXISTS password TEXT NULL, -- Will store hashed passwords
ADD COLUMN IF NOT EXISTS requires_password_change BOOLEAN DEFAULT FALSE;

-- Add comment to clarify the new password column's purpose
COMMENT ON COLUMN public.accounts_lcmd.password IS 'Stores the bcrypt hashed password for the user. Null if user is still on default password.';

-- 2. Data Migration: Move passwords from logon_lcmd to accounts_LCMD
DO $$
DECLARE
  logon_entry RECORD;
BEGIN
  -- Check if logon_lcmd table exists before attempting to migrate
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'logon_lcmd') THEN
    RAISE NOTICE 'Migrating passwords from logon_lcmd to accounts_LCMD...';
    FOR logon_entry IN SELECT l.account_number, l.password FROM public.logon_lcmd l
    LOOP
      -- Update accounts_LCMD with the password from logon_lcmd
      -- Passwords in logon_lcmd should already be hashed by previous migrations.
      UPDATE public.accounts_lcmd
      SET 
        password = logon_entry.password,
        requires_password_change = FALSE, -- User has a custom password
        updated_at = NOW()
      WHERE account_number = logon_entry.account_number;
      
      RAISE NOTICE 'Migrated password for account_number: %', logon_entry.account_number;
    END LOOP;
    RAISE NOTICE 'Password migration complete.';
  ELSE
    RAISE NOTICE 'logon_lcmd table does not exist. Skipping password migration from logon_lcmd.';
  END IF;
END;
$$;

-- 3. Data Integrity Check: Hash any unhashed passwords in accounts_LCMD.password
--    This ensures that if any plain text passwords were moved from logon_lcmd
--    or existed in accounts_lcmd.password directly, they get hashed.
DO $$
DECLARE
  acc_rec RECORD;
  hashed_password_check TEXT;
BEGIN
  RAISE NOTICE 'Checking for and hashing any plain text passwords in accounts_LCMD.password...';
  FOR acc_rec IN SELECT account_number, password FROM public.accounts_lcmd WHERE password IS NOT NULL
  LOOP
    -- Check if password is NOT already a bcrypt hash (starts with $2a$, $2b$, $2x$, or $2y$)
    -- Adjusted regex to be more inclusive of bcrypt variants like $2x$ and $2y$
    IF NOT (acc_rec.password ~ '^(\$2[axyb]\$\d{2}\$[./0-9A-Za-z]{53})$') THEN
      RAISE NOTICE 'Password for account % appears to be plain text or incorrectly hashed. Hashing now.', acc_rec.account_number;
      hashed_password_check := crypt(acc_rec.password, gen_salt('bf'));
      UPDATE public.accounts_lcmd
      SET password = hashed_password_check, updated_at = NOW()
      WHERE account_number = acc_rec.account_number;
    END IF;
  END LOOP;
  RAISE NOTICE 'Plain text password check in accounts_LCMD.password complete.';
END;
$$;

-- 4. Drop the logon_lcmd table as it's no longer needed
DROP TABLE IF EXISTS public.logon_lcmd;
RAISE NOTICE 'Dropped logon_lcmd table.';

-- 5. Drop older versions of authentication and password update functions
DROP FUNCTION IF EXISTS public.authenticate_user_lcmd(p_account_number integer, p_password text);
DROP FUNCTION IF EXISTS public.authenticate_user_lcmd(p_account_number bigint, p_password text);
DROP FUNCTION IF EXISTS public.update_user_password_lcmd(p_account_number bigint, p_new_password text);
RAISE NOTICE 'Dropped old authentication and password update functions.';

-- 6. Create the new consolidated authentication function
CREATE OR REPLACE FUNCTION public.authenticate_user(
  p_account_number BIGINT,
  p_password TEXT
)
RETURNS TABLE (
  account_number BIGINT,
  acct_name TEXT,
  address TEXT,
  city TEXT,
  state TEXT,
  zip TEXT,
  id UUID, -- This is accounts_lcmd.id (auth.users FK)
  email_address TEXT,
  mobile_phone TEXT,
  requires_password_change BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  account_record public.accounts_lcmd%ROWTYPE;
  expected_default_password TEXT;
BEGIN
  SELECT * INTO account_record
  FROM public.accounts_lcmd a
  WHERE a.account_number = p_account_number;

  IF account_record IS NULL THEN
    RETURN;
  END IF;

  IF account_record.acct_name IS NOT NULL AND account_record.zip IS NOT NULL THEN
    expected_default_password := lower(substring(account_record.acct_name FROM 1 FOR 1)) || substring(regexp_replace(account_record.zip, '[^0-9]', '', 'g') FROM 1 FOR 5);
    
    IF lower(p_password) = expected_default_password THEN
      IF account_record.password IS NULL THEN
        RETURN QUERY SELECT
          account_record.account_number,
          account_record.acct_name,
          COALESCE(account_record.address, '') AS address,
          COALESCE(account_record.city, '') AS city,
          COALESCE(account_record.state, '') AS state,
          COALESCE(account_record.zip, '') AS zip,
          account_record.id, -- UUID from accounts_lcmd
          COALESCE(account_record.email_address, account_record.contact, '') AS email_address,
          COALESCE(account_record.mobile_phone, account_record.phone, '') AS mobile_phone,
          TRUE AS requires_password_change;
        RETURN;
      END IF;
    END IF;
  END IF;

  IF account_record.password IS NOT NULL AND account_record.password = crypt(p_password, account_record.password) THEN
    RETURN QUERY SELECT
      account_record.account_number,
      account_record.acct_name,
      COALESCE(account_record.address, '') AS address,
      COALESCE(account_record.city, '') AS city,
      COALESCE(account_record.state, '') AS state,
      COALESCE(account_record.zip, '') AS zip,
      account_record.id, -- UUID from accounts_lcmd
      COALESCE(account_record.email_address, account_record.contact, '') AS email_address,
      COALESCE(account_record.mobile_phone, account_record.phone, '') AS mobile_phone,
      COALESCE(account_record.requires_password_change, FALSE) AS requires_password_change;
    RETURN;
  END IF;

  RETURN;
END;
$$;
RAISE NOTICE 'Created new authenticate_user function.';

-- 7. Create the new consolidated password update function
CREATE OR REPLACE FUNCTION public.update_user_password(
  p_account_number BIGINT,
  p_new_password TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  hashed_password TEXT;
BEGIN
  IF p_new_password IS NULL OR length(p_new_password) < 6 THEN
    RAISE EXCEPTION 'Password must be at least 6 characters long.';
    RETURN FALSE; 
  END IF;

  hashed_password := crypt(p_new_password, gen_salt('bf'));

  UPDATE public.accounts_lcmd
  SET
    password = hashed_password,
    requires_password_change = FALSE,
    updated_at = NOW()
  WHERE account_number = p_account_number;

  IF FOUND THEN
    RETURN TRUE;
  ELSE
    RAISE WARNING 'Account not found for password update: %', p_account_number;
    RETURN FALSE;
  END IF;

EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'Error updating password for account %: %', p_account_number, SQLERRM;
    RETURN FALSE;
END;
$$;
RAISE NOTICE 'Created new update_user_password function.';

-- 8. Grant execute permissions on the new functions to the authenticated role
GRANT EXECUTE ON FUNCTION public.authenticate_user(BIGINT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_user_password(BIGINT, TEXT) TO authenticated;
RAISE NOTICE 'Granted execute permissions on new functions.';

COMMENT ON FUNCTION public.authenticate_user(BIGINT, TEXT) IS 'Authenticates a user based on account number and password. Checks default pattern (first letter of acct_name + first 5 of zip) and then hashed password in accounts_LCMD. Forces password change if default is used and no custom password is set.';
COMMENT ON FUNCTION public.update_user_password(BIGINT, TEXT) IS 'Updates the user''s password in accounts_LCMD with a bcrypt hash and sets requires_password_change to false.';
