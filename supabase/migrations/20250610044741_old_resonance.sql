/*
  # Fix Missing Tables and Database Issues

  1. Create Missing Tables
    - `production_ordhist` table for order history
    - Add missing columns to existing tables

  2. Database Functions
    - Create RPC functions for authentication and order history

  3. Security
    - Enable RLS and add appropriate policies
*/

-- Create production_ordhist table if it doesn't exist
CREATE TABLE IF NOT EXISTS production_ordhist (
  id SERIAL PRIMARY KEY,
  invoice INTEGER NOT NULL,
  account_number INTEGER NOT NULL,
  acct_name TEXT,
  inv_date DATE,
  salesman TEXT,
  total NUMERIC DEFAULT 0,
  line_count INTEGER DEFAULT 0,
  part_number TEXT,
  description TEXT,
  qty NUMERIC DEFAULT 0,
  price NUMERIC DEFAULT 0,
  extended NUMERIC DEFAULT 0,
  linekey BIGINT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_production_ordhist_invoice ON production_ordhist(invoice);
CREATE INDEX IF NOT EXISTS idx_production_ordhist_account ON production_ordhist(account_number);
CREATE INDEX IF NOT EXISTS idx_production_ordhist_date ON production_ordhist(inv_date);

-- Enable RLS
ALTER TABLE production_ordhist ENABLE ROW LEVEL SECURITY;

-- Add RLS policies
CREATE POLICY "Enable read access for authenticated users" ON production_ordhist
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Enable insert access for authenticated users" ON production_ordhist
  FOR INSERT TO authenticated WITH CHECK (true);

-- Add missing columns to logon_lcmd if they don't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'logon_lcmd' AND column_name = 'updated_at'
  ) THEN
    ALTER TABLE logon_lcmd ADD COLUMN updated_at TIMESTAMPTZ DEFAULT NOW();
  END IF;
END $$;

-- Create authenticate_user_lcmd function
CREATE OR REPLACE FUNCTION authenticate_user_lcmd(
  p_account_number INTEGER,
  p_password TEXT
)
RETURNS TABLE (
  account_number INTEGER,
  acct_name TEXT,
  address TEXT,
  city TEXT,
  state TEXT,
  zip TEXT,
  requires_password_change BOOLEAN,
  authenticated BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  account_record RECORD;
  custom_password TEXT;
  default_password TEXT;
BEGIN
  -- Get account details
  SELECT * INTO account_record
  FROM accounts_lcmd a
  WHERE a.account_number = p_account_number;
  
  IF NOT FOUND THEN
    RETURN;
  END IF;
  
  -- Check for custom password in logon_lcmd
  SELECT password INTO custom_password
  FROM logon_lcmd l
  WHERE l.account_number = p_account_number;
  
  -- If custom password exists, check it
  IF custom_password IS NOT NULL THEN
    IF custom_password = p_password THEN
      RETURN QUERY SELECT 
        account_record.account_number,
        account_record.acct_name,
        account_record.address,
        account_record.city,
        account_record.state,
        account_record.zip,
        COALESCE(account_record.requires_password_change, false),
        true;
      RETURN;
    END IF;
  END IF;
  
  -- Check default password pattern (first letter + first 5 digits of zip)
  IF account_record.acct_name IS NOT NULL AND account_record.zip IS NOT NULL THEN
    default_password := LOWER(LEFT(account_record.acct_name, 1) || LEFT(account_record.zip, 5));
    IF LOWER(p_password) = default_password THEN
      RETURN QUERY SELECT 
        account_record.account_number,
        account_record.acct_name,
        account_record.address,
        account_record.city,
        account_record.state,
        account_record.zip,
        true, -- Force password change for default password
        true;
      RETURN;
    END IF;
  END IF;
  
  -- Authentication failed
  RETURN;
END;
$$;

-- Create function to get order history
CREATE OR REPLACE FUNCTION get_all_order_history_for_account(
  p_account_number INTEGER
)
RETURNS TABLE (
  invoicenumber INTEGER,
  invoicedate DATE,
  salesman TEXT,
  terms TEXT,
  model TEXT,
  "Description" TEXT,
  "Qty" NUMERIC,
  unitnet NUMERIC,
  ups NUMERIC,
  linekey BIGINT,
  total_payments_received NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.invoice,
    p.inv_date,
    p.salesman,
    'Net 10' as terms,
    p.part_number,
    p.description,
    p.qty,
    p.price,
    0::NUMERIC as ups,
    p.linekey,
    0::NUMERIC as total_payments_received
  FROM production_ordhist p
  WHERE p.account_number = p_account_number
  ORDER BY p.invoice DESC, p.linekey ASC;
END;
$$;

-- Insert some sample data for testing
INSERT INTO production_ordhist (
  invoice, account_number, acct_name, inv_date, salesman, total, line_count,
  part_number, description, qty, price, extended, linekey
) VALUES 
(750001, 101, 'Test Company', '2024-01-15', 'John Smith', 150.00, 2, 'PART001', 'Test Product 1', 1, 75.00, 75.00, 1),
(750001, 101, 'Test Company', '2024-01-15', 'John Smith', 150.00, 2, 'PART002', 'Test Product 2', 1, 75.00, 75.00, 2),
(750002, 101, 'Test Company', '2024-01-20', 'John Smith', 200.00, 1, 'PART003', 'Test Product 3', 2, 100.00, 200.00, 3)
ON CONFLICT DO NOTHING;