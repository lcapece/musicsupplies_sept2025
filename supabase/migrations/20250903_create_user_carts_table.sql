-- Create user_carts table for permanent cart persistence
-- Migration: 20250903_create_user_carts_table.sql

BEGIN;

-- Create user_carts table for permanent cart persistence
CREATE TABLE IF NOT EXISTS public.user_carts (
  id SERIAL PRIMARY KEY,
  account_number INTEGER NOT NULL REFERENCES accounts_lcmd(account_number) ON DELETE CASCADE,
  cart_data JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(account_number)
);

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_user_carts_account_number ON public.user_carts(account_number);

-- Enable RLS
ALTER TABLE public.user_carts ENABLE ROW LEVEL SECURITY;

-- Create RLS policy - users can only access their own cart
CREATE POLICY "Users can access own cart" ON public.user_carts
  FOR ALL USING (account_number = current_setting('app.current_account_number')::INTEGER);

-- Allow service role full access
CREATE POLICY "Service role full access" ON public.user_carts
  FOR ALL TO service_role USING (true);

-- Grant permissions
GRANT ALL ON public.user_carts TO authenticated;
GRANT ALL ON public.user_carts TO service_role;
GRANT USAGE, SELECT ON SEQUENCE user_carts_id_seq TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE user_carts_id_seq TO service_role;

-- Create functions for cart management
CREATE OR REPLACE FUNCTION public.save_user_cart(
  p_account_number INTEGER,
  p_cart_data JSONB
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result JSONB;
BEGIN
  -- Insert or update cart data
  INSERT INTO public.user_carts (account_number, cart_data, updated_at)
  VALUES (p_account_number, p_cart_data, NOW())
  ON CONFLICT (account_number) 
  DO UPDATE SET 
    cart_data = EXCLUDED.cart_data,
    updated_at = EXCLUDED.updated_at;

  -- Return success response
  result := jsonb_build_object(
    'success', true,
    'account_number', p_account_number,
    'updated_at', NOW()
  );

  RETURN result;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_user_cart(
  p_account_number INTEGER
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  cart_data JSONB;
BEGIN
  -- Get cart data for user
  SELECT uc.cart_data INTO cart_data
  FROM public.user_carts uc
  WHERE uc.account_number = p_account_number;

  -- Return cart data or empty array if not found
  RETURN COALESCE(cart_data, '[]'::jsonb);
END;
$$;

CREATE OR REPLACE FUNCTION public.clear_user_cart(
  p_account_number INTEGER
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result JSONB;
BEGIN
  -- Clear cart data
  UPDATE public.user_carts 
  SET cart_data = '[]'::jsonb, updated_at = NOW()
  WHERE account_number = p_account_number;

  -- If no row exists, insert empty cart
  INSERT INTO public.user_carts (account_number, cart_data, updated_at)
  VALUES (p_account_number, '[]'::jsonb, NOW())
  ON CONFLICT (account_number) DO NOTHING;

  -- Return success response
  result := jsonb_build_object(
    'success', true,
    'account_number', p_account_number,
    'cleared_at', NOW()
  );

  RETURN result;
END;
$$;

-- Grant execute permissions on functions
GRANT EXECUTE ON FUNCTION public.save_user_cart(INTEGER, JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_cart(INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION public.clear_user_cart(INTEGER) TO authenticated;

COMMIT;
