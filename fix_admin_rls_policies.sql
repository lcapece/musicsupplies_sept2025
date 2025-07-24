-- Fix RLS policies for admin access to logon_lcmd table
-- This allows admin users (account 999) to manage passwords

-- Enable RLS on logon_lcmd table if not already enabled
ALTER TABLE logon_lcmd ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS "admin_full_access_logon" ON logon_lcmd;
DROP POLICY IF EXISTS "users_own_logon_access" ON logon_lcmd;

-- Create policy allowing admin full access to logon_lcmd table
CREATE POLICY "admin_full_access_logon" ON logon_lcmd
FOR ALL
TO authenticated
USING (
  -- Allow if user is admin (account 999) or special admin (account 99)
  auth.jwt() ->> 'account_number' IN ('999', '99')
)
WITH CHECK (
  -- Allow if user is admin (account 999) or special admin (account 99)
  auth.jwt() ->> 'account_number' IN ('999', '99')
);

-- Create policy allowing users to access their own logon records
CREATE POLICY "users_own_logon_access" ON logon_lcmd
FOR ALL
TO authenticated
USING (
  -- Users can access their own records
  account_number::text = auth.jwt() ->> 'account_number'
)
WITH CHECK (
  -- Users can modify their own records
  account_number::text = auth.jwt() ->> 'account_number'
);

-- Also ensure accounts_lcmd table has proper admin policies
DROP POLICY IF EXISTS "admin_full_access_accounts" ON accounts_lcmd;
DROP POLICY IF EXISTS "users_own_account_access" ON accounts_lcmd;

-- Create policy allowing admin full access to accounts_lcmd table
CREATE POLICY "admin_full_access_accounts" ON accounts_lcmd
FOR ALL
TO authenticated
USING (
  -- Allow if user is admin (account 999) or special admin (account 99)
  auth.jwt() ->> 'account_number' IN ('999', '99')
)
WITH CHECK (
  -- Allow if user is admin (account 999) or special admin (account 99)
  auth.jwt() ->> 'account_number' IN ('999', '99')
);

-- Create policy allowing users to access their own account records
CREATE POLICY "users_own_account_access" ON accounts_lcmd
FOR ALL
TO authenticated
USING (
  -- Users can access their own records
  account_number::text = auth.jwt() ->> 'account_number'
)
WITH CHECK (
  -- Users can modify their own records (for password changes)
  account_number::text = auth.jwt() ->> 'account_number'
);

-- Fix RLS policies for production_ordhist table (Order History)
DROP POLICY IF EXISTS "admin_full_access_ordhist" ON production_ordhist;
DROP POLICY IF EXISTS "users_own_ordhist_access" ON production_ordhist;

-- Create policy allowing admin full access to production_ordhist table
CREATE POLICY "admin_full_access_ordhist" ON production_ordhist
FOR ALL
TO authenticated
USING (
  -- Allow if user is admin (account 999) or special admin (account 99)
  auth.jwt() ->> 'account_number' IN ('999', '99')
)
WITH CHECK (
  -- Allow if user is admin (account 999) or special admin (account 99)
  auth.jwt() ->> 'account_number' IN ('999', '99')
);

-- Create policy allowing users to access their own order history
CREATE POLICY "users_own_ordhist_access" ON production_ordhist
FOR SELECT
TO authenticated
USING (
  -- Users can access their own order history
  account_number::text = auth.jwt() ->> 'account_number'
);

-- Comment explaining the fix
COMMENT ON POLICY "admin_full_access_logon" ON logon_lcmd IS 
'Allows admin users (account 999, 99) full access to manage all login passwords';

COMMENT ON POLICY "admin_full_access_accounts" ON accounts_lcmd IS 
'Allows admin users (account 999, 99) full access to manage all account records';

COMMENT ON POLICY "admin_full_access_ordhist" ON production_ordhist IS 
'Allows admin users (account 999, 99) full access to view all order history';
