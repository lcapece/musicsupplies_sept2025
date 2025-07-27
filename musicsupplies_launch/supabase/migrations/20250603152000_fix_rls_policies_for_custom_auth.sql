/*
  # Fix RLS policies for custom authentication
  
  Since the app uses custom authentication (not Supabase Auth),
  we need to allow anon access to the tables
*/

-- Drop existing policies
DROP POLICY IF EXISTS "Allow authenticated users full access" ON accounts_lcmd;
DROP POLICY IF EXISTS "Allow authenticated users full access" ON lcmd_discount;
DROP POLICY IF EXISTS "Allow authenticated users full access" ON rt_productgroups;
DROP POLICY IF EXISTS "Allow authenticated users full access" ON lcmd_products;

-- Create new policies for anon access
CREATE POLICY "Allow anon users full access" ON accounts_lcmd
  FOR ALL
  TO anon
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow anon users full access" ON lcmd_discount
  FOR ALL
  TO anon
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow anon users full access" ON rt_productgroups
  FOR ALL
  TO anon
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow anon users full access" ON lcmd_products
  FOR ALL
  TO anon
  USING (true)
  WITH CHECK (true);
