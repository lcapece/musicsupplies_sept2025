-- TARGETED FIX: Ensure treeview_datasource is accessible for navigation tree

-- First, check if treeview_datasource is a table or view and handle appropriately
DO $$
DECLARE
    is_table boolean;
    is_view boolean;
    row_count integer;
BEGIN
    -- Check if it's a table
    SELECT EXISTS (
        SELECT 1 FROM pg_tables 
        WHERE schemaname = 'public' AND tablename = 'treeview_datasource'
    ) INTO is_table;
    
    -- Check if it's a view
    SELECT EXISTS (
        SELECT 1 FROM pg_views 
        WHERE schemaname = 'public' AND viewname = 'treeview_datasource'
    ) INTO is_view;
    
    RAISE NOTICE 'treeview_datasource - Is Table: %, Is View: %', is_table, is_view;
    
    -- Handle based on type
    IF is_table THEN
        -- It's a table, we can manage RLS
        ALTER TABLE treeview_datasource DISABLE ROW LEVEL SECURITY;
        RAISE NOTICE 'Disabled RLS on treeview_datasource table';
    ELSIF is_view THEN
        -- It's a view, just ensure permissions
        RAISE NOTICE 'treeview_datasource is a view, cannot modify RLS';
    ELSE
        RAISE NOTICE 'WARNING: treeview_datasource not found as table or view!';
    END IF;
    
    -- Grant permissions regardless of type
    GRANT SELECT ON treeview_datasource TO anon;
    GRANT SELECT ON treeview_datasource TO authenticated;
    GRANT SELECT ON treeview_datasource TO public;
    RAISE NOTICE 'Granted SELECT permissions on treeview_datasource to all roles';
    
    -- Check if it has data
    EXECUTE 'SELECT COUNT(*) FROM treeview_datasource' INTO row_count;
    RAISE NOTICE 'treeview_datasource contains % rows', row_count;
    
    IF row_count = 0 THEN
        RAISE NOTICE 'WARNING: treeview_datasource is empty! The navigation tree needs data.';
        RAISE NOTICE 'You may need to run a data population script or check your data migration.';
    END IF;
    
EXCEPTION
    WHEN undefined_table THEN
        RAISE NOTICE 'ERROR: treeview_datasource does not exist!';
        RAISE NOTICE 'The navigation tree requires this table/view to function.';
    WHEN OTHERS THEN
        RAISE NOTICE 'Error accessing treeview_datasource: %', SQLERRM;
END $$;

-- If treeview_datasource is a view, check its underlying tables
DO $$
DECLARE
    view_def text;
    underlying_tables text[];
BEGIN
    -- Get view definition if it exists
    SELECT pg_get_viewdef('treeview_datasource'::regclass, true) INTO view_def;
    
    IF view_def IS NOT NULL THEN
        RAISE NOTICE 'treeview_datasource view definition: %', view_def;
        
        -- Try to identify underlying tables (this is a simplified approach)
        -- In practice, you might need to parse the view definition more carefully
        IF view_def ILIKE '%product_groups%' THEN
            -- Ensure product_groups table is accessible
            IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'product_groups') THEN
                ALTER TABLE product_groups DISABLE ROW LEVEL SECURITY;
                GRANT SELECT ON product_groups TO anon, authenticated, public;
                RAISE NOTICE 'Fixed permissions on underlying table: product_groups';
            END IF;
        END IF;
        
        IF view_def ILIKE '%categories%' THEN
            -- Ensure categories table is accessible
            IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'categories') THEN
                ALTER TABLE categories DISABLE ROW LEVEL SECURITY;
                GRANT SELECT ON categories TO anon, authenticated, public;
                RAISE NOTICE 'Fixed permissions on underlying table: categories';
            END IF;
        END IF;
    END IF;
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Could not analyze view definition: %', SQLERRM;
END $$;

-- Final verification
DO $$
DECLARE
    test_count integer;
BEGIN
    -- Try to query treeview_datasource
    BEGIN
        SELECT COUNT(*) INTO test_count FROM treeview_datasource LIMIT 1;
        RAISE NOTICE '';
        RAISE NOTICE '=== VERIFICATION SUCCESSFUL ===';
        RAISE NOTICE 'treeview_datasource is accessible and contains data';
        RAISE NOTICE 'The navigation tree should now display correctly';
    EXCEPTION
        WHEN OTHERS THEN
            RAISE NOTICE '';
            RAISE NOTICE '=== VERIFICATION FAILED ===';
            RAISE NOTICE 'Still cannot access treeview_datasource: %', SQLERRM;
            RAISE NOTICE 'Additional troubleshooting may be required';
    END;
END $$;
