-- FIX FOR PRODUCTS NOT SHOWING (products_supabase is a VIEW)

-- First, let's find what tables the products_supabase view depends on
DO $$
DECLARE
    view_def TEXT;
    underlying_tables TEXT[];
    tbl TEXT;
BEGIN
    -- Get the view definition
    SELECT pg_get_viewdef('products_supabase'::regclass, true) INTO view_def;
    RAISE NOTICE 'View definition for products_supabase: %', view_def;
    
    -- Find all tables referenced in the view
    SELECT ARRAY_AGG(DISTINCT tablename)
    INTO underlying_tables
    FROM pg_depend d
    JOIN pg_class c ON d.refobjid = c.oid
    JOIN pg_namespace n ON c.relnamespace = n.oid
    JOIN pg_tables t ON t.tablename = c.relname AND t.schemaname = n.nspname
    WHERE d.objid = 'products_supabase'::regclass::oid
    AND d.deptype = 'n';
    
    RAISE NOTICE 'Underlying tables for products_supabase view: %', underlying_tables;
    
    -- Disable RLS on each underlying table
    IF underlying_tables IS NOT NULL THEN
        FOREACH tbl IN ARRAY underlying_tables
        LOOP
            EXECUTE format('ALTER TABLE %I DISABLE ROW LEVEL SECURITY', tbl);
            RAISE NOTICE 'Disabled RLS on table: %', tbl;
        END LOOP;
    END IF;
END $$;

-- Common tables that might be underlying the products view
-- Disable RLS on these if they exist
DO $$ 
BEGIN
    -- Check and disable RLS on products table
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'products') THEN
        ALTER TABLE products DISABLE ROW LEVEL SECURITY;
        GRANT SELECT ON products TO anon;
        GRANT SELECT ON products TO authenticated;
        RAISE NOTICE 'Disabled RLS on products table';
    END IF;
    
    -- Check and disable RLS on pre_products_supabase table
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'pre_products_supabase') THEN
        ALTER TABLE pre_products_supabase DISABLE ROW LEVEL SECURITY;
        GRANT SELECT ON pre_products_supabase TO anon;
        GRANT SELECT ON pre_products_supabase TO authenticated;
        RAISE NOTICE 'Disabled RLS on pre_products_supabase table';
    END IF;
    
    -- Check and disable RLS on rt_extended table
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'rt_extended') THEN
        ALTER TABLE rt_extended DISABLE ROW LEVEL SECURITY;
        GRANT SELECT ON rt_extended TO anon;
        GRANT SELECT ON rt_extended TO authenticated;
        RAISE NOTICE 'Disabled RLS on rt_extended table';
    END IF;
    
    -- Check and disable RLS on product_groups table
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'product_groups') THEN
        ALTER TABLE product_groups DISABLE ROW LEVEL SECURITY;
        GRANT SELECT ON product_groups TO anon;
        GRANT SELECT ON product_groups TO authenticated;
        RAISE NOTICE 'Disabled RLS on product_groups table';
    END IF;
    
    -- Check and disable RLS on treeview_datasource
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'treeview_datasource') THEN
        ALTER TABLE treeview_datasource DISABLE ROW LEVEL SECURITY;
        GRANT SELECT ON treeview_datasource TO anon;
        GRANT SELECT ON treeview_datasource TO authenticated;
        RAISE NOTICE 'Disabled RLS on treeview_datasource table';
    END IF;
END $$;

-- Grant permissions on the view itself
GRANT SELECT ON products_supabase TO anon;
GRANT SELECT ON products_supabase TO authenticated;

-- Verify the view returns data
DO $$
DECLARE
    product_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO product_count FROM products_supabase;
    RAISE NOTICE '';
    RAISE NOTICE '=== VERIFICATION ===';
    RAISE NOTICE 'Total products visible in products_supabase view: %', product_count;
    
    IF product_count = 0 THEN
        RAISE NOTICE 'WARNING: No products found! Check if underlying tables have data.';
    ELSE
        RAISE NOTICE 'SUCCESS: Products are accessible!';
    END IF;
END $$;

-- Final message
DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '=== FIX COMPLETE ===';
    RAISE NOTICE 'RLS has been disabled on all potential underlying tables.';
    RAISE NOTICE 'Permissions have been granted to anon and authenticated roles.';
    RAISE NOTICE '';
    RAISE NOTICE 'If products are still not showing:';
    RAISE NOTICE '1. Check browser console for errors';
    RAISE NOTICE '2. Clear browser cache and refresh';
    RAISE NOTICE '3. Check network tab for failed requests';
    RAISE NOTICE '4. Run: SELECT * FROM products_supabase LIMIT 5; to verify data exists';
END $$;
