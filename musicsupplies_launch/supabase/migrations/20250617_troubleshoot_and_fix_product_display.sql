-- TROUBLESHOOTING SCRIPT FOR PRODUCT DISPLAY ISSUES

-- First, let's check which tables have RLS enabled
DO $$
DECLARE
    tbl RECORD;
    has_rls BOOLEAN;
BEGIN
    RAISE NOTICE 'Checking RLS status on all product-related tables...';
    
    FOR tbl IN 
        SELECT tablename 
        FROM pg_tables 
        WHERE schemaname = 'public' 
        AND (tablename LIKE '%product%' OR tablename = 'rt_extended' OR tablename = 'treeview_datasource')
    LOOP
        SELECT relrowsecurity INTO has_rls
        FROM pg_class
        WHERE relname = tbl.tablename
        AND relnamespace = 'public'::regnamespace;
        
        RAISE NOTICE 'Table % - RLS Enabled: %', tbl.tablename, has_rls;
    END LOOP;
END $$;

-- OPTION 1: Disable RLS completely on all product-related tables (simplest fix)
-- Uncomment the lines below to disable RLS:

ALTER TABLE products_supabase DISABLE ROW LEVEL SECURITY;
ALTER TABLE rt_extended DISABLE ROW LEVEL SECURITY;

-- Also disable on other product tables if they exist
DO $$ 
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'products') THEN
        ALTER TABLE products DISABLE ROW LEVEL SECURITY;
    END IF;
    
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'pre_products_supabase') THEN
        ALTER TABLE pre_products_supabase DISABLE ROW LEVEL SECURITY;
    END IF;
    
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'treeview_datasource') THEN
        ALTER TABLE treeview_datasource DISABLE ROW LEVEL SECURITY;
    END IF;
END $$;

-- Verify data exists in products_supabase
DO $$
DECLARE
    product_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO product_count FROM products_supabase;
    RAISE NOTICE 'Total products in products_supabase table: %', product_count;
    
    -- Show sample products
    RAISE NOTICE 'Sample products:';
    FOR i IN (SELECT partnumber, description, price, inventory FROM products_supabase LIMIT 5)
    LOOP
        RAISE NOTICE 'Part: %, Desc: %, Price: %, Inv: %', i.partnumber, i.description, i.price, i.inventory;
    END LOOP;
END $$;

-- OPTION 2: If you prefer to keep RLS enabled, use this instead:
-- (Comment out OPTION 1 above and uncomment the lines below)

/*
-- Ensure policies allow public access
ALTER TABLE products_supabase ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow authenticated users to select from products_supabase" ON public.products_supabase;
DROP POLICY IF EXISTS "Allow public read access to products_supabase" ON public.products_supabase;
CREATE POLICY "Allow all users to read products_supabase"
ON public.products_supabase
FOR SELECT
USING (true);

ALTER TABLE rt_extended ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all users to read rt_extended" ON public.rt_extended;
CREATE POLICY "Allow all users to read rt_extended"
ON public.rt_extended
FOR SELECT
USING (true);
*/

-- Grant necessary permissions
GRANT SELECT ON products_supabase TO anon;
GRANT SELECT ON products_supabase TO authenticated;
GRANT SELECT ON rt_extended TO anon;
GRANT SELECT ON rt_extended TO authenticated;

-- Final check
DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '=== TROUBLESHOOTING COMPLETE ===';
    RAISE NOTICE 'RLS has been DISABLED on all product tables.';
    RAISE NOTICE 'This should immediately fix the product display issue.';
    RAISE NOTICE 'If products are still not showing, check:';
    RAISE NOTICE '1. Browser console for any JavaScript errors';
    RAISE NOTICE '2. Network tab for failed API requests';
    RAISE NOTICE '3. Ensure the frontend is properly deployed with latest changes';
END $$;
