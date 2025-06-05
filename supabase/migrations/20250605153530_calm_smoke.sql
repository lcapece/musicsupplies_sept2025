/*
  # Add proper password hashing to logon system

  1. Enable pgcrypto extension for password hashing
  2. Update authenticate_user_lcmd function to use hashed passwords
  3. Update update_user_password_lcmd function to hash passwords before storing
  4. Migrate any existing plain text passwords to hashed versions

  Security: Uses bcrypt hashing with salt for secure password storage
*/

-- Enable pgcrypto extension for password hashing functions
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- First, check if updated_at column exists in logon_lcmd table, and add it if it doesn't
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT FROM information_schema.columns 
    WHERE table_name = 'logon_lcmd' AND column_name = 'updated_at'
  ) THEN
    EXECUTE 'ALTER TABLE logon_lcmd ADD COLUMN updated_at TIMESTAMPTZ DEFAULT NOW()';
  END IF;
END $$;

-- Update the authentication function to handle hashed passwords
CREATE OR REPLACE FUNCTION authenticate_user_lcmd(
  p_account_number bigint,
  p_password text
)
RETURNS TABLE (
  account_number bigint,
  acct_name text,
  address text,
  city text,
  state text,
  zip text,
  id uuid,
  email_address text,
  mobile_phone text,
  requires_password_change boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  account_record RECORD;
  expected_default_password text;
  logon_record RECORD;
BEGIN
  -- First, get the account details from accounts_lcmd
  SELECT * INTO account_record
  FROM accounts_lcmd a
  WHERE a.account_number = p_account_number;
  
  -- If account doesn't exist, return empty result
  IF account_record IS NULL THEN
    RETURN;
  END IF;
  
  -- Check if account has a hashed password in logon_lcmd table
  SELECT * INTO logon_record
  FROM logon_lcmd l
  WHERE l.account_number = p_account_number;
  
  -- If found in logon_lcmd, validate against stored hashed password
  IF logon_record IS NOT NULL THEN
    -- Use crypt() to verify password against stored hash
    IF logon_record.password = crypt(p_password, logon_record.password) THEN
      -- Password matches, return account data with no password change required
      RETURN QUERY SELECT 
        account_record.account_number,
        account_record.acct_name,
        account_record.address,
        account_record.city,
        account_record.state,
        account_record.zip,
        account_record.id,
        account_record.email_address,
        account_record.mobile_phone,
        false as requires_password_change;
    END IF;
    -- If password doesn't match, return empty (invalid login)
    RETURN;
  END IF;
  
  -- If not in logon_lcmd, check if password matches default pattern
  -- Default pattern: first letter of account name + first 5 digits of zip code (case insensitive)
  IF account_record.acct_name IS NOT NULL AND account_record.zip IS NOT NULL THEN
    expected_default_password := lower(substring(account_record.acct_name from 1 for 1)) || lower(substring(account_record.zip from 1 for 5));
    
    IF lower(p_password) = expected_default_password THEN
      -- Default password matches, return account data with password change required
      RETURN QUERY SELECT 
        account_record.account_number,
        account_record.acct_name,
        account_record.address,
        account_record.city,
        account_record.state,
        account_record.zip,
        account_record.id,
        account_record.email_address,
        account_record.mobile_phone,
        true as requires_password_change;
    END IF;
  END IF;
  
  -- If we get here, authentication failed
  RETURN;
END;
$$;

-- Update function to store hashed passwords in logon_lcmd
CREATE OR REPLACE FUNCTION update_user_password_lcmd(
  p_account_number bigint,
  p_new_password text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  hashed_password text;
BEGIN
  -- Generate salt and hash the password using bcrypt
  hashed_password := crypt(p_new_password, gen_salt('bf'));
  
  -- Insert or update hashed password in logon_lcmd
  -- Use dynamic SQL to handle the case where updated_at might not exist
  EXECUTE 'INSERT INTO logon_lcmd (account_number, password, created_at' || 
          CASE WHEN EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'logon_lcmd' AND column_name = 'updated_at')
               THEN ', updated_at' ELSE '' END || 
          ') VALUES ($1, $2, now()' || 
          CASE WHEN EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'logon_lcmd' AND column_name = 'updated_at')
               THEN ', now()' ELSE '' END || 
          ') ON CONFLICT (account_number) DO UPDATE SET password = $2' ||
          CASE WHEN EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'logon_lcmd' AND column_name = 'updated_at')
               THEN ', updated_at = now()' ELSE '' END
  USING p_account_number, hashed_password;
  
  -- Update requires_password_change flag to false
  UPDATE accounts_lcmd 
  SET requires_password_change = false, updated_at = now()
  WHERE account_number = p_account_number;
  
  RETURN true;
EXCEPTION
  WHEN OTHERS THEN
    RETURN false;
END;
$$;

-- Migrate any existing plain text passwords to hashed versions
-- This will hash any existing passwords that are not already hashed
DO $$
DECLARE
  rec RECORD;
  hashed_password text;
  has_updated_at BOOLEAN;
BEGIN
  -- Check if updated_at column exists
  SELECT EXISTS (
    SELECT FROM information_schema.columns 
    WHERE table_name = 'logon_lcmd' AND column_name = 'updated_at'
  ) INTO has_updated_at;

  -- Loop through existing passwords that might be plain text
  FOR rec IN SELECT account_number, password FROM logon_lcmd 
  LOOP
    -- Check if password is already hashed (bcrypt hashes start with $2a$, $2b$, or $2y$)
    IF NOT (rec.password ~ '^(\$2[abyxy]?\$|^\$2\$)') THEN
      -- Password appears to be plain text, hash it
      hashed_password := crypt(rec.password, gen_salt('bf'));
      
      -- Update with hashed version
      IF has_updated_at THEN
        EXECUTE 'UPDATE logon_lcmd SET password = $1, updated_at = now() WHERE account_number = $2'
        USING hashed_password, rec.account_number;
      ELSE
        EXECUTE 'UPDATE logon_lcmd SET password = $1 WHERE account_number = $2'
        USING hashed_password, rec.account_number;
      END IF;
      
      RAISE NOTICE 'Migrated password for account %', rec.account_number;
    END IF;
  END LOOP;
END;
$$;

-- Add comment to logon_lcmd table to document password hashing
DO $$
BEGIN
  EXECUTE 'COMMENT ON COLUMN logon_lcmd.password IS ''Bcrypt hashed password with salt - never store plain text passwords''';
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'Could not add comment to password column: %', SQLERRM;
END;
$$;