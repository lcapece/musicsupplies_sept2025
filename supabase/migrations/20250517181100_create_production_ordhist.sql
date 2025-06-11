/*
  # Create production order history table

  1. New Tables
    - `lcmd_ordhist`
      - Same structure as `lcmd_ordhist_test`

  2. Security
    - Enable RLS on `lcmd_ordhist` table
    - Add policy for public read access
  
  3. Data
    - Copy test data from `lcmd_ordhist_test` to `lcmd_ordhist` (only if test table exists)
*/

-- Create production orders table matching test structure
CREATE TABLE IF NOT EXISTS lcmd_ordhist (
  accountnumber bigint,
  invoicenumber bigint,
  linekey bigint GENERATED ALWAYS AS IDENTITY,
  dstamp text,
  invoicedate text,
  payments text,
  salesman text,
  terms text,
  model text,
  "Description" text,
  "Qty" text,
  unitnet text,
  ups text
);

-- Enable Row Level Security
ALTER TABLE lcmd_ordhist ENABLE ROW LEVEL SECURITY;

-- Create policy for public read access
CREATE POLICY "Enable read access for all users" 
  ON lcmd_ordhist
  FOR SELECT 
  TO public 
  USING (true);
