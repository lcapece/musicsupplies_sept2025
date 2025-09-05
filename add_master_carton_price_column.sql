-- Add master_carton_price column to pre_products_supabase table
ALTER TABLE pre_products_supabase 
ADD COLUMN IF NOT EXISTS master_carton_price DECIMAL(10,2);

-- Add comment to document the column
COMMENT ON COLUMN pre_products_supabase.master_carton_price IS 'Master carton price for bulk purchasing';

-- Update any existing records that might have this data in another table
-- (This is optional - you can populate this manually or from another source)
