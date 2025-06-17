-- Drop the existing policy that requires authentication
DROP POLICY IF EXISTS "Allow authenticated users to select from products_supabase" ON public.products_supabase;

-- Create a new policy that allows public/anon access to products
-- This makes sense as products are catalog data that should be viewable by all users
CREATE POLICY "Allow public read access to products_supabase"
ON public.products_supabase
FOR SELECT
TO anon, authenticated
USING (true);

-- Add a comment explaining the policy
COMMENT ON POLICY "Allow public read access to products_supabase" ON public.products_supabase IS 
'Products are public catalog data that should be accessible to all users, including non-authenticated visitors';
