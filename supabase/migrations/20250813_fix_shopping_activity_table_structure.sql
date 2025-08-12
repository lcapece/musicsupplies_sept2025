-- Fix shopping_activity table to match application code expectations
-- The code expects 'action' and 'product_sku' columns but the table has 'activity_type' and 'activity_data'

-- First, let's check if the table exists and has any data
DO $$
BEGIN
    -- Add the missing columns if they don't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'shopping_activity' 
                   AND column_name = 'action') THEN
        ALTER TABLE shopping_activity ADD COLUMN action VARCHAR(100);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'shopping_activity' 
                   AND column_name = 'product_sku') THEN
        ALTER TABLE shopping_activity ADD COLUMN product_sku VARCHAR(255);
    END IF;

    -- If we have existing data with activity_type, copy it to action
    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_name = 'shopping_activity' 
               AND column_name = 'activity_type') THEN
        UPDATE shopping_activity SET action = activity_type WHERE action IS NULL;
    END IF;

    -- If we have existing data in activity_data with product_sku, extract it
    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_name = 'shopping_activity' 
               AND column_name = 'activity_data') THEN
        UPDATE shopping_activity 
        SET product_sku = activity_data->>'product_sku' 
        WHERE product_sku IS NULL 
        AND activity_data ? 'product_sku';
    END IF;
END $$;

-- Make account_id nullable since the error shows it can be null for guest users
ALTER TABLE shopping_activity ALTER COLUMN account_id DROP NOT NULL;

-- Add an index on the new columns for performance
CREATE INDEX IF NOT EXISTS idx_shopping_activity_action ON shopping_activity(action);
CREATE INDEX IF NOT EXISTS idx_shopping_activity_product_sku ON shopping_activity(product_sku);

-- Update RLS policies to handle null account_id for guest users
DROP POLICY IF EXISTS "Users can insert shopping activity" ON shopping_activity;

CREATE POLICY "Users can insert shopping activity" ON shopping_activity
    FOR INSERT
    TO authenticated, anon
    WITH CHECK (true);

-- Allow anonymous users to insert as well for guest tracking
GRANT INSERT ON shopping_activity TO anon;

-- Add comment about the columns
COMMENT ON COLUMN shopping_activity.action IS 'The type of action performed (view, add_to_cart, etc.)';
COMMENT ON COLUMN shopping_activity.product_sku IS 'The SKU/part number of the product involved in the action';
