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

-- 3. Drop the logon_lcmd table as it's no longer needed
DROP TABLE IF EXISTS public.logon_lcmd;
RAISE NOTICE 'Dropped logon_lcmd table.';

-- 4. Drop older versions of authentication and password update functions
DROP FUNCTION IF EXISTS public.authenticate_user_lcmd(p_account_number integer, p_password text);
DROP FUNCTION IF EXISTS public.authenticate_user_lcmd(p_account_number bigint, p_password text);
DROP FUNCTION IF EXISTS public.update_user_password_lcmd(p_account_number bigint, p_new_password text);
RAISE NOTICE 'Dropped old authentication and password update functions.';

-- 5. Create the new consolidated authentication function
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
  id UUID,
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
  -- Get account details
  SELECT * INTO account_record
  FROM public.accounts_lcmd a
  WHERE a.account_number = p_account_number;

  -- If account doesn't exist, return empty
  IF account_record IS NULL THEN
    RETURN;
  END IF;

  -- Check for default password pattern: first letter of acct_name (case-insensitive) + first 5 digits of zip
  -- This check is only relevant if the account_record.password IS NULL (meaning no custom password set yet)
  IF account_record.acct_name IS NOT NULL AND account_record.zip IS NOT NULL THEN
    expected_default_password := lower(substring(account_record.acct_name FROM 1 FOR 1)) || substring(regexp_replace(account_record.zip, '[^0-9]', '', 'g') FROM 1 FOR 5);
    
    IF lower(p_password) = expected_default_password THEN
      -- Default password matches.
      -- If a custom password IS ALSO set, the custom one should take precedence.
      -- So, this branch is primarily for users who haven't set a custom password yet.
      IF account_record.password IS NULL THEN
        RETURN QUERY SELECT
          account_record.account_number,
          account_record.acct_name,
          COALESCE(account_record.address, '') AS address,
          COALESCE(account_record.city, '') AS city,
          COALESCE(account_record.state, '') AS state,
          COALESCE(account_record.zip, '') AS zip,
          account_record.id,
          COALESCE(account_record.email_address, account_record.contact, '') AS email_address,
          COALESCE(account_record.mobile_phone, account_record.phone, '') AS mobile_phone,
          TRUE AS requires_password_change; -- Force change if logging in with default
        RETURN;
      END IF;
    END IF;
  END IF;

  -- Check against stored hashed password in accounts_LCMD.password
  IF account_record.password IS NOT NULL AND account_record.password = crypt(p_password, account_record.password) THEN
    RETURN QUERY SELECT
      account_record.account_number,
      account_record.acct_name,
      COALESCE(account_record.address, '') AS address,
      COALESCE(account_record.city, '') AS city,
      COALESCE(account_record.state, '') AS state,
      COALESCE(account_record.zip, '') AS zip,
      account_record.id,
      COALESCE(account_record.email_address, account_record.contact, '') AS email_address,
      COALESCE(account_record.mobile_phone, account_record.phone, '') AS mobile_phone,
      COALESCE(account_record.requires_password_change, FALSE) AS requires_password_change;
    RETURN;
  END IF;

  -- If we reach here, authentication failed
  RETURN;
END;
$$;
RAISE NOTICE 'Created new authenticate_user function.';

-- 6. Create the new consolidated password update function
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
  -- Ensure p_new_password is not empty or too short (basic validation)
  IF p_new_password IS NULL OR length(p_new_password) < 6 THEN
    RAISE EXCEPTION 'Password must be at least 6 characters long.';
    RETURN FALSE; -- Should not be reached due to RAISE
  END IF;

  -- Generate salt and hash the password using bcrypt
  hashed_password := crypt(p_new_password, gen_salt('bf'));

  -- Update password and flag in accounts_LCMD
  UPDATE public.accounts_lcmd
  SET
    password = hashed_password,
    requires_password_change = FALSE,
    updated_at = NOW()
  WHERE account_number = p_account_number;

  IF FOUND THEN
    RETURN TRUE;
  ELSE
    -- Account not found
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

-- Grant execute permissions on the new functions to the authenticated role
GRANT EXECUTE ON FUNCTION public.authenticate_user(BIGINT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_user_password(BIGINT, TEXT) TO authenticated;
RAISE NOTICE 'Granted execute permissions on new functions.';

COMMENT ON FUNCTION public.authenticate_user(BIGINT, TEXT) IS 'Authenticates a user based on account number and password. Checks default pattern (first letter of acct_name + first 5 of zip) and then hashed password in accounts_LCMD. Forces password change if default is used.';
COMMENT ON FUNCTION public.update_user_password(BIGINT, TEXT) IS 'Updates the user''s password in accounts_LCMD with a bcrypt hash and sets requires_password_change to false.';
