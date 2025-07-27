-- FIX: Disable RLS on treeview_datasource table (navigation tree data)

ALTER TABLE treeview_datasource DISABLE ROW LEVEL SECURITY;

-- Grant permissions to both anon and authenticated roles
GRANT SELECT ON treeview_datasource TO anon;
GRANT SELECT ON treeview_datasource TO authenticated;

-- Verify the fix
DO $$
DECLARE
    category_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO category_count FROM treeview_datasource;
    RAISE NOTICE 'Categories visible in treeview_datasource: %', category_count;
    
    IF category_count > 0 THEN
        RAISE NOTICE 'SUCCESS: Navigation tree data is now accessible!';
    ELSE
        RAISE NOTICE 'WARNING: No categories found. Check if treeview_datasource has data.';
    END IF;
END $$;
