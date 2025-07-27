/*
  # Create test accounts table

  1. New Tables
    - `accounts_lcmd_test`
      - `account_number` (bigint, primary key)
      - `password` (text)
      - `acct_name` (text)
      - `address` (text)
      - `city` (text)
      - `state` (text)
      - `zip` (text)

  2. Security
    - Enable RLS on `accounts_lcmd_test` table
    - Add policy for public read access
*/

-- Create test accounts table matching production structure
CREATE TABLE IF NOT EXISTS accounts_lcmd_test (
  account_number bigint PRIMARY KEY,
  password text NOT NULL,
  acct_name text,
  address text,
  city text,
  state text,
  zip text
);

-- Enable Row Level Security
ALTER TABLE accounts_lcmd_test ENABLE ROW LEVEL SECURITY;

-- Create policy for public read access
CREATE POLICY "Enable read access for all users"
  ON accounts_lcmd_test
  FOR SELECT
  TO public
  USING (true);

-- Insert sample test data
INSERT INTO accounts_lcmd_test
  (account_number, password, acct_name, address, city, state, zip)
VALUES
  (101, 'test123', 'Joe''s Music Store', '123 Main St', 'Springfield', 'IL', '62701'),
  (102, 'test123', 'Music World Inc.', '456 Broadway', 'Chicago', 'IL', '60601');

-- Ensure the production table exists
CREATE TABLE IF NOT EXISTS accounts_lcmd (
  account_number bigint PRIMARY KEY,
  password text NOT NULL,
  acct_name text,
  address text,
  city text,
  state text,
  zip text
);

-- Insert the test accounts into the production table if they don't exist
INSERT INTO accounts_lcmd (account_number, password, acct_name, address, city, state, zip)
SELECT account_number, password, acct_name, address, city, state, zip 
FROM accounts_lcmd_test
ON CONFLICT (account_number) DO NOTHING;
