/*
  # Create SMS verification table

  1. New Tables
    - `sms_verification_codes`
      - `id` (uuid, primary key)
      - `account_number` (bigint, unique)
      - `phone_number` (text)
      - `verification_code` (text)
      - `expires_at` (timestamp with time zone)
      - `verified` (boolean)
      - `created_at` (timestamp with time zone)

  2. Security
    - Enable RLS on `sms_verification_codes` table
    - Add policy for authenticated access only

  3. Functions
    - Create function to verify SMS code
*/

-- Create sms_verification_codes table
CREATE TABLE IF NOT EXISTS sms_verification_codes (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  account_number bigint UNIQUE NOT NULL,
  phone_number text NOT NULL,
  verification_code text NOT NULL,
  expires_at timestamptz NOT NULL,
  verified boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_sms_verification_account_number ON sms_verification_codes(account_number);
CREATE INDEX IF NOT EXISTS idx_sms_verification_expires_at ON sms_verification_codes(expires_at);

-- Enable Row Level Security
ALTER TABLE sms_verification_codes ENABLE ROW LEVEL SECURITY;

-- Create policy for authenticated access
CREATE POLICY "Enable access for authenticated users"
  ON sms_verification_codes
  FOR ALL
  TO authenticated
  USING (true);

-- Add SMS consent fields to accounts_lcmd table
ALTER TABLE accounts_lcmd 
ADD COLUMN IF NOT EXISTS sms_consent boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS sms_consent_date timestamptz;

-- Create function to verify SMS code
CREATE OR REPLACE FUNCTION verify_sms_code_lcmd(
  p_account_number bigint,
  p_verification_code text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  verification_record RECORD;
BEGIN
  -- Get the verification record
  SELECT * INTO verification_record
  FROM sms_verification_codes
  WHERE account_number = p_account_number
    AND verification_code = p_verification_code
    AND expires_at > now()
    AND verified = false;
  
  -- If no valid record found, return false
  IF verification_record IS NULL THEN
    RETURN false;
  END IF;
  
  -- Mark as verified
  UPDATE sms_verification_codes 
  SET verified = true
  WHERE id = verification_record.id;
  
  -- Update account with SMS consent
  UPDATE accounts_lcmd 
  SET 
    sms_consent = true,
    sms_consent_date = now(),
    mobile_phone = verification_record.phone_number,
    updated_at = now()
  WHERE account_number = p_account_number;
  
  RETURN true;
EXCEPTION
  WHEN OTHERS THEN
    RETURN false;
END;
$$;

-- Create function to clean up expired verification codes
CREATE OR REPLACE FUNCTION cleanup_expired_sms_codes()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  DELETE FROM sms_verification_codes 
  WHERE expires_at < now() - INTERVAL '1 hour';
END;
$$;
