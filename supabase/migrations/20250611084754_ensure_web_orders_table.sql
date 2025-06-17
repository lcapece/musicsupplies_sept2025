-- Migration to ensure web_orders table exists and has the necessary structure

CREATE TABLE IF NOT EXISTS public.web_orders (
  id SERIAL PRIMARY KEY, -- This is the ID column CartContext is trying to select
  order_number INTEGER UNIQUE NOT NULL, -- From WB{nextOrderNumber}
  account_number INTEGER NOT NULL, -- Foreign key to accounts.account_number or accounts.id if it's an integer
  order_comments TEXT,
  order_items JSONB,
  subtotal NUMERIC(10, 2),
  discount_percentage NUMERIC(5, 2),
  discount_amount NUMERIC(10, 2),
  grand_total NUMERIC(10, 2),
  status TEXT DEFAULT 'Pending Confirmation',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Add foreign key constraint if accounts table uses an integer PK named 'id'
-- If accounts.account_number is the intended FK and it's also integer, this could be:
-- ALTER TABLE public.web_orders
-- ADD CONSTRAINT fk_account_number
-- FOREIGN KEY (account_number) REFERENCES public.accounts(id); -- Or accounts(account_number_column_if_int_pk)
-- This part is commented out as the exact structure of 'accounts' PK for this relation is unclear.
-- The CartContext uses an integer `accountNumberInt`.

COMMENT ON TABLE public.web_orders IS 'Stores orders placed through the web application.';
COMMENT ON COLUMN public.web_orders.id IS 'Auto-incrementing primary key for the web order.';
COMMENT ON COLUMN public.web_orders.order_number IS 'Sequential order number, prefixed with WB in application.';
COMMENT ON COLUMN public.web_orders.account_number IS 'Customer account number associated with the order.';
COMMENT ON COLUMN public.web_orders.order_items IS 'JSONB array of items in the order, including details like partnumber, description, quantity, price.';
COMMENT ON COLUMN public.web_orders.status IS 'Current status of the order (e.g., Pending Confirmation, Processing, Shipped).';

-- Enable RLS
ALTER TABLE public.web_orders ENABLE ROW LEVEL SECURITY;

-- Policies:
-- Allow users to view their own orders. Assumes 'account_number' in web_orders
-- matches an 'account_number' field linked to the authenticated user.
-- This policy might need adjustment based on how user identity is mapped to account_number.
CREATE POLICY "Users can view their own web orders"
  ON public.web_orders FOR SELECT
  USING (auth.uid() IN (SELECT account_number FROM public.accounts_lcmd WHERE accounts_lcmd.account_number = web_orders.account_number)); -- Example linkage

-- Allow service roles (e.g., backend functions) to manage all orders.
CREATE POLICY "Service roles can manage web orders"
  ON public.web_orders FOR ALL
  USING (true) -- Or more restrictive: USING (auth.role() = 'service_role')
  WITH CHECK (true);

-- Create an index on order_number for faster lookups if it's frequently queried.
CREATE INDEX IF NOT EXISTS idx_web_orders_order_number ON public.web_orders(order_number);

-- Create an index on account_number for faster lookups of customer orders.
CREATE INDEX IF NOT EXISTS idx_web_orders_account_number ON public.web_orders(account_number);
