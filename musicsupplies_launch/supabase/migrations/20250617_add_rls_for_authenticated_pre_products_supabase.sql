CREATE POLICY "Allow authenticated users to select from pre_products_supabase"
ON public.pre_products_supabase
FOR SELECT
TO authenticated
USING (true);
