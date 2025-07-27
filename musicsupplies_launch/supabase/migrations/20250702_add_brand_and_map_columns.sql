/*
  Add brand and map columns to products_supabase table
  
  This migration adds:
  - brand: the manufacturer/brand name of the product
  - map: Manufacturer's Advertised Price
*/

-- Check if brand column exists and add it if it doesn't
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'products_supabase'
    AND column_name = 'brand'
  ) THEN
    ALTER TABLE products_supabase ADD COLUMN brand VARCHAR(100);
  END IF;
END$$;

-- Check if map column exists and add it if it doesn't
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'products_supabase'
    AND column_name = 'map'
  ) THEN
    ALTER TABLE products_supabase ADD COLUMN map DECIMAL(10, 2);
  END IF;
END$$;

-- Add brand and map columns to the stg_update_skus table as well
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'stg_update_skus'
    AND column_name = 'map'
  ) THEN
    ALTER TABLE stg_update_skus ADD COLUMN map DECIMAL(10, 2);
  END IF;
END$$;

-- We already have brand in stg_update_skus
