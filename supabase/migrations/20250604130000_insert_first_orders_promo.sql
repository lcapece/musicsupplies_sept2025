-- Insert the first orders promo discount tiers
-- These are order-based discounts for new customers

INSERT INTO discount_tiers (
  discount_type,
  discount,
  max_orders,
  created_at,
  updated_at
) VALUES 
-- 5% discount for first 3 orders
('order_based', 0.05, 3, NOW(), NOW())
ON CONFLICT DO NOTHING;

-- Add a comment for clarity
COMMENT ON TABLE discount_tiers IS 'Stores both amount-based discounts (from lcmd_discount table logic) and order-based discounts for new customer promotions';
