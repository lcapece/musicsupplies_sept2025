-- Create tree view data source table for category tree
CREATE TABLE IF NOT EXISTS tree_view_data_source (
  id SERIAL PRIMARY KEY,
  category_code TEXT NOT NULL,
  category_name TEXT NOT NULL,
  parent_category_code TEXT,
  is_main_category BOOLEAN NOT NULL DEFAULT FALSE,
  display_order INTEGER NOT NULL DEFAULT 0,
  icon_name TEXT,
  product_count INTEGER DEFAULT 0
);

-- Create index for performance
CREATE INDEX IF NOT EXISTS tree_view_parent_category_idx ON tree_view_data_source(parent_category_code);

-- Insert main categories
INSERT INTO tree_view_data_source 
(category_code, category_name, is_main_category, display_order, icon_name)
SELECT DISTINCT 
  prdmaincat as category_code, 
  prdmaincat as category_name, 
  TRUE as is_main_category,
  ROW_NUMBER() OVER (ORDER BY prdmaincat) as display_order,
  NULL as icon_name
FROM lcmd_products
WHERE prdmaincat IS NOT NULL AND prdmaincat != ''
ON CONFLICT DO NOTHING;

-- Insert sub categories
INSERT INTO tree_view_data_source 
(category_code, category_name, parent_category_code, is_main_category, display_order, product_count)
SELECT DISTINCT 
  prdsubcat as category_code, 
  prdsubcat as category_name,
  prdmaincat as parent_category_code,
  FALSE as is_main_category,
  ROW_NUMBER() OVER (PARTITION BY prdmaincat ORDER BY prdsubcat) as display_order,
  COUNT(*) as product_count
FROM lcmd_products
WHERE prdsubcat IS NOT NULL AND prdsubcat != ''
GROUP BY prdmaincat, prdsubcat
ON CONFLICT DO NOTHING;

-- Add specific icons for main categories
UPDATE tree_view_data_source
SET icon_name = CASE 
  WHEN category_name = 'Acccessories & Supplies' THEN 'Acccessories & Supplies'
  WHEN category_name = 'Amps, Speakers, Mic''s & Sound' THEN 'Amps, Speakers, Mic''s & Sound'
  WHEN category_name = 'Band & Orchestra' THEN 'Band & Orchestra'
  WHEN category_name = 'Cables' THEN 'Cables'
  WHEN category_name = 'Fretted Instruments' THEN 'Fretted Instruments'
  WHEN category_name = 'Guitar Accessories' THEN 'Guitar Accessories'
  WHEN category_name = 'Guitar Parts' THEN 'Guitar Parts'
  WHEN category_name = 'Instructional Material' THEN 'Instructional Material'
  WHEN category_name = 'Instrument Cases & Bags' THEN 'Instrument Cases & Bags'
  WHEN category_name = 'Instrument Display Hangers' THEN 'Instrument Display Hangers'
  WHEN category_name = 'Keyboards, Pianos & Accordions' THEN 'Keyboards, Pianos & Accordions'
  WHEN category_name = 'Maintenance & Cleaners' THEN 'Maintenance & Cleaners'
  WHEN category_name = 'Pedals & Effects' THEN 'Pedals & Effects'
  WHEN category_name = 'Percussion' THEN 'Percussion'
  WHEN category_name = 'Picks' THEN 'Picks'
  WHEN category_name = 'Small & Hand Instruments' THEN 'Small & Hand Instruments'
  WHEN category_name = 'Stands & Lighting' THEN 'Stands & Lighting'
  WHEN category_name = 'Straps' THEN 'Straps'
  WHEN category_name = 'String Instrument Parts & Supplies' THEN 'String Instrument Parts & Supplies'
  WHEN category_name = 'String Instruments' THEN 'String Instruments'
  WHEN category_name = 'Strings' THEN 'Strings'
  ELSE NULL
END
WHERE is_main_category = TRUE;

-- Create functions to refresh the tree view data
CREATE OR REPLACE FUNCTION refresh_tree_view_data()
RETURNS VOID AS $$
BEGIN
  -- Truncate the tree view data source table
  TRUNCATE TABLE tree_view_data_source;
  
  -- Insert main categories
  INSERT INTO tree_view_data_source 
  (category_code, category_name, is_main_category, display_order, icon_name)
  SELECT DISTINCT 
    prdmaincat as category_code, 
    prdmaincat as category_name, 
    TRUE as is_main_category,
    ROW_NUMBER() OVER (ORDER BY prdmaincat) as display_order,
    NULL as icon_name
  FROM lcmd_products
  WHERE prdmaincat IS NOT NULL AND prdmaincat != '';
  
  -- Insert sub categories
  INSERT INTO tree_view_data_source 
  (category_code, category_name, parent_category_code, is_main_category, display_order, product_count)
  SELECT DISTINCT 
    prdsubcat as category_code, 
    prdsubcat as category_name,
    prdmaincat as parent_category_code,
    FALSE as is_main_category,
    ROW_NUMBER() OVER (PARTITION BY prdmaincat ORDER BY prdsubcat) as display_order,
    COUNT(*) as product_count
  FROM lcmd_products
  WHERE prdsubcat IS NOT NULL AND prdsubcat != ''
  GROUP BY prdmaincat, prdsubcat;
  
  -- Update icons
  UPDATE tree_view_data_source
  SET icon_name = CASE 
    WHEN category_name = 'Acccessories & Supplies' THEN 'Acccessories & Supplies'
    WHEN category_name = 'Amps, Speakers, Mic''s & Sound' THEN 'Amps, Speakers, Mic''s & Sound'
    WHEN category_name = 'Band & Orchestra' THEN 'Band & Orchestra'
    WHEN category_name = 'Cables' THEN 'Cables'
    WHEN category_name = 'Fretted Instruments' THEN 'Fretted Instruments'
    WHEN category_name = 'Guitar Accessories' THEN 'Guitar Accessories'
    WHEN category_name = 'Guitar Parts' THEN 'Guitar Parts'
    WHEN category_name = 'Instructional Material' THEN 'Instructional Material'
    WHEN category_name = 'Instrument Cases & Bags' THEN 'Instrument Cases & Bags'
    WHEN category_name = 'Instrument Display Hangers' THEN 'Instrument Display Hangers'
    WHEN category_name = 'Keyboards, Pianos & Accordions' THEN 'Keyboards, Pianos & Accordions'
    WHEN category_name = 'Maintenance & Cleaners' THEN 'Maintenance & Cleaners'
    WHEN category_name = 'Pedals & Effects' THEN 'Pedals & Effects'
    WHEN category_name = 'Percussion' THEN 'Percussion'
    WHEN category_name = 'Picks' THEN 'Picks'
    WHEN category_name = 'Small & Hand Instruments' THEN 'Small & Hand Instruments'
    WHEN category_name = 'Stands & Lighting' THEN 'Stands & Lighting'
    WHEN category_name = 'Straps' THEN 'Straps'
    WHEN category_name = 'String Instrument Parts & Supplies' THEN 'String Instrument Parts & Supplies'
    WHEN category_name = 'String Instruments' THEN 'String Instruments'
    WHEN category_name = 'Strings' THEN 'Strings'
    ELSE NULL
  END
  WHERE is_main_category = TRUE;
END;
$$ LANGUAGE plpgsql;

-- Create a trigger to automatically refresh the tree view data when products are updated
CREATE OR REPLACE FUNCTION trigger_refresh_tree_view_data()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM refresh_tree_view_data();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add a trigger to refresh the tree view data when products are updated
DROP TRIGGER IF EXISTS products_tree_view_refresh_trigger ON lcmd_products;
CREATE TRIGGER products_tree_view_refresh_trigger
AFTER INSERT OR UPDATE OR DELETE ON lcmd_products
FOR EACH STATEMENT
EXECUTE PROCEDURE trigger_refresh_tree_view_data();

-- Execute the refresh function to populate the table initially
SELECT refresh_tree_view_data();
