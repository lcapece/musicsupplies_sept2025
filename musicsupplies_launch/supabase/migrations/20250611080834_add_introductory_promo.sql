-- Migration to add support for "5% off first three orders" introductory promotion

-- 1. Add columns to the 'accounts' table to track introductory promotion usage.
--    - intro_promo_id: Foreign key to the discount_tiers table, identifying the specific introductory promo.
--    - intro_promo_uses_remaining: Number of times the customer can still use this promo.
ALTER TABLE public.accounts
ADD COLUMN IF NOT EXISTS intro_promo_id INTEGER REFERENCES public.discount_tiers(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS intro_promo_uses_remaining INTEGER DEFAULT NULL;

COMMENT ON COLUMN public.accounts.intro_promo_id IS 'ID of the active introductory promotion for this account, if any.';
COMMENT ON COLUMN public.accounts.intro_promo_uses_remaining IS 'Number of uses remaining for the introductory promotion. Set to max_orders when promo is first applied.';

-- 2. Insert the new "New Customer Welcome Offer" into the 'discount_tiers' table.
--    This promotion gives 5% off for a maximum of 3 orders.
INSERT INTO public.discount_tiers (
  name,
  description,
  discount_type, -- Using a new type to specifically identify this kind of promo
  value,         -- Percentage value for the discount
  is_active,
  max_orders,    -- Maximum number of orders this discount applies to
  requires_code,
  minimum_purchase_amount,
  applicable_to_specific_products,
  specific_product_ids,
  start_date,
  end_date
) VALUES (
  'New Customer Welcome Offer',
  '5% off your first three orders placed through the new system.',
  'introductory_percentage_first_n_orders', -- New discount type
  5.00,          -- 5% discount
  TRUE,          -- Promo is active by default
  3,             -- Applies to the first 3 orders
  FALSE,         -- No code required, should be applied automatically
  0.00,          -- No minimum purchase amount
  FALSE,         -- Applies to all products
  NULL,          -- Not applicable to specific products
  NOW(),         -- Starts immediately
  NULL           -- No specific end date for the promotion itself (customer usage is limited)
)
ON CONFLICT (name) DO NOTHING; -- Avoid inserting if a promo with the same name already exists.

-- Note:
-- The 'discount_type' column in 'discount_tiers' is assumed to be VARCHAR.
-- If it's an ENUM or has a CHECK constraint, that would need to be updated separately
-- to include 'introductory_percentage_first_n_orders'.

-- Logic to apply this promo (setting accounts.intro_promo_id and accounts.intro_promo_uses_remaining)
-- will be handled by backend application logic (e.g., upon new account creation or first login
-- for existing accounts that qualify).

-- Logic to decrement intro_promo_uses_remaining and check eligibility during checkout
-- will also be handled by backend application logic.
