-- Add test promo codes for development and testing

-- Insert test promo codes if they don't already exist
INSERT INTO promo_codes (
  code, 
  name, 
  type, 
  value, 
  min_order_value, 
  max_uses, 
  uses_remaining, 
  start_date, 
  end_date, 
  is_active,
  max_uses_per_account,
  uses_per_account_tracking
) VALUES 
(
  'SAVE10',
  '10% Off Any Order',
  'percent_off',
  10.00,
  0.00,
  NULL,
  NULL,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP + INTERVAL '1 year',
  TRUE,
  NULL,
  FALSE
),
(
  'WELCOME25',
  'Welcome $25 Off',
  'dollars_off',
  25.00,
  100.00,
  1000,
  1000,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP + INTERVAL '6 months',
  TRUE,
  3,
  TRUE
),
(
  'BIGORDER50',
  '$50 Off Orders Over $500',
  'dollars_off',
  50.00,
  500.00,
  NULL,
  NULL,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP + INTERVAL '1 year',
  TRUE,
  NULL,
  FALSE
)
ON CONFLICT (code) DO NOTHING;
