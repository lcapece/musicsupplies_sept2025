-- Fix RLS for products_supabase table
ALTER TABLE products_supabase ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow authenticated users to select from products_supabase" ON public.products_supabase;
CREATE POLICY "Allow public read access to products_supabase"
ON public.products_supabase
FOR SELECT
TO anon, authenticated
USING (true);

-- Fix RLS for products table (if it exists)
DO $$ 
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'products') THEN
        ALTER TABLE products ENABLE ROW LEVEL SECURITY;
        DROP POLICY IF EXISTS "Allow authenticated users to select from products" ON public.products;
        CREATE POLICY "Allow public read access to products"
        ON public.products
        FOR SELECT
        TO anon, authenticated
        USING (true);
    END IF;
END $$;

-- Fix RLS for rt_extended table (product details)
DO $$ 
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'rt_extended') THEN
        ALTER TABLE rt_extended ENABLE ROW LEVEL SECURITY;
        DROP POLICY IF EXISTS "Allow authenticated users to select from rt_extended" ON public.rt_extended;
        CREATE POLICY "Allow public read access to rt_extended"
        ON public.rt_extended
        FOR SELECT
        TO anon, authenticated
        USING (true);
    END IF;
END $$;

-- Fix RLS for pre_products_supabase table (if it exists)
DO $$ 
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'pre_products_supabase') THEN
        ALTER TABLE pre_products_supabase ENABLE ROW LEVEL SECURITY;
        DROP POLICY IF EXISTS "Allow authenticated users to select from pre_products_supabase" ON public.pre_products_supabase;
        CREATE POLICY "Allow public read access to pre_products_supabase"
        ON public.pre_products_supabase
        FOR SELECT
        TO anon, authenticated
        USING (true);
    END IF;
END $$;

-- Ensure treeview_datasource is also accessible (for category tree)
DO $$ 
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'treeview_datasource') THEN
        ALTER TABLE treeview_datasource ENABLE ROW LEVEL SECURITY;
        DROP POLICY IF EXISTS "Allow read access to treeview_datasource" ON public.treeview_datasource;
        CREATE POLICY "Allow public read access to treeview_datasource"
        ON public.treeview_datasource
        FOR SELECT
        TO anon, authenticated
        USING (true);
    END IF;
END $$;

-- Add comment explaining the policies
COMMENT ON POLICY "Allow public read access to products_supabase" ON public.products_supabase IS 
'Products are public catalog data that should be accessible to all users, including non-authenticated visitors';
