/*
  # Add webmspr field to products_supabase table
  
  1. Updates
    - Add webmspr column to products_supabase table
    - Add longdescription column to products_supabase table
    - Insert sample data for testing
*/

-- Add webmspr column to products_supabase table if it doesn't exist
ALTER TABLE products_supabase 
ADD COLUMN IF NOT EXISTS webmspr NUMERIC;

-- Add longdescription column to products_supabase table if it doesn't exist
ALTER TABLE products_supabase 
ADD COLUMN IF NOT EXISTS longdescription TEXT;

-- Update sample product with webmspr value
UPDATE products_supabase
SET webmspr = 799.00
WHERE partnumber = '1447-1B';

-- Update sample product with longdescription
UPDATE products_supabase
SET longdescription = '<p>This is a detailed description of the product. It may contain <strong>HTML</strong> formatting.</p><ul><li>Feature 1</li><li>Feature 2</li><li>Feature 3</li></ul>'
WHERE partnumber = '1447-1B';

-- Insert a test product if it doesn't exist
INSERT INTO products_supabase (
  partnumber, 
  description, 
  price, 
  inventory, 
  prdmaincat, 
  prdsubcat, 
  webmspr,
  longdescription
)
VALUES (
  '1447-1B', 
  'Test Product with List Price', 
  599.00, 
  10, 
  'Fretted Instruments', 
  'Electric Guitars', 
  799.00,
  '<p>This is a detailed description of the product. It may contain <strong>HTML</strong> formatting.</p><ul><li>Feature 1</li><li>Feature 2</li><li>Feature 3</li></ul>'
)
ON CONFLICT (partnumber) DO UPDATE 
SET 
  webmspr = 799.00,
  longdescription = '<p>This is a detailed description of the product. It may contain <strong>HTML</strong> formatting.</p><ul><li>Feature 1</li><li>Feature 2</li><li>Feature 3</li></ul>';