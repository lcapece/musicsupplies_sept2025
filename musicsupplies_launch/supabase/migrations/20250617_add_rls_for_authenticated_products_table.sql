-- Enable RLS on the products table
ALTER TABLE products ENABLE ROW LEVEL SECURITY;

-- Drop any existing policy with the same name to prevent errors on re-run
DROP POLICY IF EXISTS "Allow authenticated users to select from products" ON public.products;

-- Create a policy to allow authenticated users to select products
CREATE POLICY "Allow authenticated users to select from products"
ON public.products
FOR SELECT
TO authenticated
USING (true);
