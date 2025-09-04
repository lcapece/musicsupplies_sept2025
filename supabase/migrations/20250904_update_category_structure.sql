-- Migration: Update category structure from two-level to single category field
-- Date: 2025-09-04
-- Description: Remove prdmaincat and prdsubcat columns, add single category INTEGER field

-- First, create a categories lookup table
CREATE TABLE IF NOT EXISTS categories (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL UNIQUE,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert some sample categories (you can modify these as needed)
INSERT INTO categories (name, description) VALUES
    ('Cars', 'Automotive vehicles'),
    ('Trucks', 'Commercial and personal trucks'),
    ('Boats', 'Marine vessels and watercraft'),
    ('Powersport', 'Motorcycles, ATVs, and recreational vehicles')
ON CONFLICT (name) DO NOTHING;

-- Add the new category column to products_supabase table
ALTER TABLE products_supabase 
ADD COLUMN IF NOT EXISTS category INTEGER REFERENCES categories(id);

-- Add the new category column to pre_products_supabase table (if it exists)
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'pre_products_supabase') THEN
        ALTER TABLE pre_products_supabase 
        ADD COLUMN IF NOT EXISTS category INTEGER REFERENCES categories(id);
    END IF;
END $$;

-- Create an index on the category column for better performance
CREATE INDEX IF NOT EXISTS idx_products_supabase_category ON products_supabase(category);

-- Create an index on pre_products_supabase category column (if table exists)
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'pre_products_supabase') THEN
        CREATE INDEX IF NOT EXISTS idx_pre_products_supabase_category ON pre_products_supabase(category);
    END IF;
END $$;

-- Optional: Migrate existing data from prdmaincat/prdsubcat to category
-- This is commented out because we don't know the exact mapping logic you want
-- You can uncomment and modify this section based on your specific needs

/*
-- Example migration logic (uncomment and modify as needed):
-- Update products where prdmaincat = 'AUTOMOTIVE' to category = 1 (Cars)
UPDATE products_supabase 
SET category = 1 
WHERE prdmaincat ILIKE '%automotive%' OR prdmaincat ILIKE '%car%';

-- Update products where prdmaincat contains 'TRUCK' to category = 2 (Trucks)  
UPDATE products_supabase 
SET category = 2 
WHERE prdmaincat ILIKE '%truck%';

-- Update products where prdmaincat contains 'BOAT' or 'MARINE' to category = 3 (Boats)
UPDATE products_supabase 
SET category = 3 
WHERE prdmaincat ILIKE '%boat%' OR prdmaincat ILIKE '%marine%';

-- Update products where prdmaincat contains 'MOTOR' or 'ATV' to category = 4 (Powersport)
UPDATE products_supabase 
SET category = 4 
WHERE prdmaincat ILIKE '%motor%' OR prdmaincat ILIKE '%atv%' OR prdmaincat ILIKE '%powersport%';
*/

-- After migration is complete and tested, you can drop the old columns
-- IMPORTANT: Only run these DROP statements after you've verified the migration worked correctly
-- and you've backed up your data!

-- DROP COLUMN statements (commented out for safety)
-- ALTER TABLE products_supabase DROP COLUMN IF EXISTS prdmaincat;
-- ALTER TABLE products_supabase DROP COLUMN IF EXISTS prdsubcat;

-- DO $$ 
-- BEGIN
--     IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'pre_products_supabase') THEN
--         ALTER TABLE pre_products_supabase DROP COLUMN IF EXISTS prdmaincat;
--         ALTER TABLE pre_products_supabase DROP COLUMN IF EXISTS prdsubcat;
--     END IF;
-- END $$;

-- Create a function to get category name by ID (useful for queries)
CREATE OR REPLACE FUNCTION get_category_name(category_id INTEGER)
RETURNS TEXT AS $$
BEGIN
    RETURN (SELECT name FROM categories WHERE id = category_id);
END;
$$ LANGUAGE plpgsql;

-- Create a function to get category ID by name (useful for inserts/updates)
CREATE OR REPLACE FUNCTION get_category_id(category_name TEXT)
RETURNS INTEGER AS $$
BEGIN
    RETURN (SELECT id FROM categories WHERE name ILIKE category_name);
END;
$$ LANGUAGE plpgsql;

-- Add a comment to document the migration
COMMENT ON TABLE categories IS 'Lookup table for product categories - replaces the old prdmaincat/prdsubcat structure';
COMMENT ON COLUMN products_supabase.category IS 'Foreign key reference to categories table - replaces prdmaincat/prdsubcat columns';
