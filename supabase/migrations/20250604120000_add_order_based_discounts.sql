-- Add order-based discount support
ALTER TABLE discount_tiers 
ADD COLUMN IF NOT EXISTS discount_type VARCHAR(50) DEFAULT 'amount_based',
ADD COLUMN IF NOT EXISTS max_orders INTEGER,
ADD COLUMN IF NOT EXISTS orders_used INTEGER DEFAULT 0;

-- Create a table to track order discount usage per account
CREATE TABLE IF NOT EXISTS account_order_discounts (
  id SERIAL PRIMARY KEY,
  account_number VARCHAR(50) NOT NULL,
  discount_tier_id INTEGER NOT NULL REFERENCES discount_tiers(id) ON DELETE CASCADE,
  orders_used INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(account_number, discount_tier_id)
);

-- Add RLS policies for the new table
ALTER TABLE account_order_discounts ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to read their own discount usage
CREATE POLICY "Users can view own order discount usage" ON account_order_discounts
  FOR SELECT USING (auth.uid()::text = account_number);

-- Allow system to update discount usage
CREATE POLICY "System can manage order discounts" ON account_order_discounts
  FOR ALL USING (true);

-- Update discount_tiers to support both amount-based and order-based discounts
COMMENT ON COLUMN discount_tiers.discount_type IS 'Type of discount: amount_based or order_based';
COMMENT ON COLUMN discount_tiers.max_orders IS 'Maximum number of orders this discount applies to (for order_based type)';
COMMENT ON COLUMN discount_tiers.orders_used IS 'Number of orders that have used this discount (deprecated - use account_order_discounts)';
