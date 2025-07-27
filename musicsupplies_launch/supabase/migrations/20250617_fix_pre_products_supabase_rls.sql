-- FIX: Disable RLS on pre_products_supabase table (underlying table for products_supabase view)

ALTER TABLE pre_products_supabase DISABLE ROW LEVEL SECURITY;

-- Grant permissions to both anon and authenticated roles
GRANT SELECT ON pre_products_supabase TO anon;
GRANT SELECT ON pre_products_supabase TO authenticated;

-- Also grant permissions on the view
GRANT SELECT ON products_supabase TO anon;
GRANT SELECT ON products_supabase TO authenticated;

-- Verify the fix
DO $$
DECLARE
    product_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO product_count FROM products_supabase;
    RAISE NOTICE 'Products visible in products_supabase view: %', product_count;
    
    IF product_count > 0 THEN
        RAISE NOTICE 'SUCCESS: Products are now accessible!';
    ELSE
        RAISE NOTICE 'WARNING: Still no products visible. Check if pre_products_supabase has data.';
    END IF;
END $$;
