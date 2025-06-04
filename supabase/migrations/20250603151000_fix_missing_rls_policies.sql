/*
  # Fix missing RLS policies
  
  Add missing RLS policy for rt_productgroups table to allow authenticated users to access the data
*/

-- Add RLS policy for rt_productgroups table
CREATE POLICY "Allow authenticated users full access" ON rt_productgroups
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Also enable RLS on lcmd_products and add policy for consistency
ALTER TABLE lcmd_products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow authenticated users full access" ON lcmd_products
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);
