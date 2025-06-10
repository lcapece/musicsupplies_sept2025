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
  FOR SELECT TO anon USING (true);

-- Insert sample data for testing
INSERT INTO production_ordhist (
  invoice, account_number, acct_name, inv_date, salesman, total, line_count,
  part_number, description, qty, price, extended, linekey
) VALUES 
(750001, 101, 'All Music', '2024-01-15', 'John Smith', 150.00, 2, 'PART001', 'Test Product 1', 1, 75.00, 75.00, 1),
(750001, 101, 'All Music', '2024-01-15', 'John Smith', 150.00, 2, 'PART002', 'Test Product 2', 1, 75.00, 75.00, 2),
(750002, 101, 'All Music', '2024-01-20', 'John Smith', 200.00, 1, 'PART003', 'Test Product 3', 2, 100.00, 200.00, 3)
ON CONFLICT DO NOTHING;