-- Enable RLS on the products_supabase table
ALTER TABLE products_supabase ENABLE ROW LEVEL SECURITY;

-- Drop any existing policy with the same name to prevent errors on re-run
DROP POLICY IF EXISTS "Allow authenticated users to select from products_supabase" ON public.products_supabase;

-- Create a policy to allow authenticated users to select products
CREATE POLICY "Allow authenticated users to select from products_supabase"
ON public.products_supabase
FOR SELECT
TO authenticated
USING (true);
