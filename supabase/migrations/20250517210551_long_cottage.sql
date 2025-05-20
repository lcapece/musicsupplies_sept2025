/*
  # Create test orders table

  1. New Tables
    - `lcmd_ordhist_test`
      - `accountnumber` (bigint)
      - `invoicenumber` (bigint)
      - `dstamp` (text)
      - `salesman` (text)
      - `terms` (text)
      - `model` (text)
      - `Description` (text)
      - `Qty` (text)
      - `unitnet` (text)

  2. Security
    - Enable RLS on `lcmd_ordhist_test` table
    - Add policy for public read access
*/

-- Create test orders table matching production structure
CREATE TABLE IF NOT EXISTS lcmd_ordhist_test (
  accountnumber bigint,
  invoicenumber bigint,
  dstamp text,
  salesman text,
  terms text,
  model text,
  "Description" text,
  "Qty" text,
  unitnet text
);

-- Enable Row Level Security
ALTER TABLE lcmd_ordhist_test ENABLE ROW LEVEL SECURITY;

-- Create policy for public read access
CREATE POLICY "Enable read access for all users" 
  ON lcmd_ordhist_test
  FOR SELECT 
  TO public 
  USING (true);

-- Insert sample test data
INSERT INTO lcmd_ordhist_test 
  (accountnumber, invoicenumber, dstamp, salesman, terms, model, "Description", "Qty", unitnet)
VALUES
  (101, 12345, '2025-05-01', 'John Smith', 'Net 30', 'GU100', 'Electric Guitar', '1', '599.99'),
  (101, 12345, '2025-05-01', 'John Smith', 'Net 30', 'ST200', 'Guitar Stand', '2', '29.99'),
  (101, 12346, '2025-05-15', 'Jane Doe', 'Credit Card', 'DR500', 'Drum Set', '1', '899.99'),
  (102, 12347, '2025-05-16', 'Mike Wilson', 'Net 30', 'KB300', 'Digital Piano', '1', '799.99'),
  (102, 12347, '2025-05-16', 'Mike Wilson', 'Net 30', 'BH100', 'Piano Bench', '1', '79.99'),
  (102, 12348, '2025-05-17', 'Mike Wilson', 'Credit Card', 'MIC50', 'Microphone', '3', '149.99');