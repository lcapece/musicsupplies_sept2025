/*
  # Create logon_lcmd table for password management

  1. New Tables
    - `logon_lcmd`
      - `id` (uuid, primary key)
      - `account_number` (bigint, unique)
      - `password` (text)
      - `created_at` (timestamp with time zone)
      - `updated_at` (timestamp with time zone)

  2. Security
    - Enable RLS on `logon_lcmd` table
    - Add policy for authenticated access only

  3. Functions
    - Update authenticate_user_lcmd function to handle new logic
*/

-- Create logon_lcmd table
CREATE TABLE IF NOT EXISTS logon_lcmd (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  account_number bigint UNIQUE NOT NULL,
  password text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_logon_lcmd_account_number ON logon_lcmd(account_number);

-- Enable Row Level Security
ALTER TABLE logon_lcmd ENABLE ROW LEVEL SECURITY;

-- Create policy for authenticated access
CREATE POLICY "Enable access for authenticated users"
  ON logon_lcmd
  FOR ALL
  TO authenticated
  USING (true);

-- Update accounts_lcmd table to include necessary fields if not present
ALTER TABLE accounts_lcmd 
ADD COLUMN IF NOT EXISTS id uuid DEFAULT gen_random_uuid(),
ADD COLUMN IF NOT EXISTS requires_password_change boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS email_address text,
ADD COLUMN IF NOT EXISTS mobile_phone text,
ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT now(),
ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

-- Create or replace the authentication function
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
  
  -- Check if account has a password in logon_lcmd table
  SELECT * INTO logon_record
  FROM logon_lcmd l
  WHERE l.account_number = p_account_number;
  
  -- If found in logon_lcmd, validate against stored password
  IF logon_record IS NOT NULL THEN
    IF logon_record.password = p_password THEN
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

-- Create function to update password in logon_lcmd
CREATE OR REPLACE FUNCTION update_user_password_lcmd(
  p_account_number bigint,
  p_new_password text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Insert or update password in logon_lcmd
  INSERT INTO logon_lcmd (account_number, password, created_at, updated_at)
  VALUES (p_account_number, p_new_password, now(), now())
  ON CONFLICT (account_number) 
  DO UPDATE SET 
    password = EXCLUDED.password,
    updated_at = now();
  
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
