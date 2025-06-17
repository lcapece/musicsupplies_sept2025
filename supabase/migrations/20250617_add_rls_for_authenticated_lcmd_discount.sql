CREATE POLICY "Allow authenticated users to manage lcmd_discount"
ON public.lcmd_discount
FOR ALL
TO authenticated
USING (true) WITH CHECK (true);
