-- Add session tracking columns to web_orders table
ALTER TABLE public.web_orders 
ADD COLUMN IF NOT EXISTS session_id TEXT,
ADD COLUMN IF NOT EXISTS reserved_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS completed_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS abandoned_at TIMESTAMP WITH TIME ZONE;

-- Add index for session lookups
CREATE INDEX IF NOT EXISTS idx_web_orders_session_id ON public.web_orders(session_id);
CREATE INDEX IF NOT EXISTS idx_web_orders_status ON public.web_orders(status);
CREATE INDEX IF NOT EXISTS idx_web_orders_reserved_at ON public.web_orders(reserved_at);

-- Update status column to include new statuses
ALTER TABLE public.web_orders 
ALTER COLUMN status SET DEFAULT 'Reserved';

-- Create or replace the order pre-allocation function
CREATE OR REPLACE FUNCTION public.reserve_order_number(p_session_id TEXT, p_account_number INTEGER)
RETURNS TABLE(order_number INTEGER, order_id INTEGER) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_order_number INTEGER;
    v_order_id INTEGER;
    v_existing_order RECORD;
BEGIN
    -- Check if this session already has a reserved order
    SELECT wo.id, wo.order_number INTO v_existing_order
    FROM public.web_orders wo
    WHERE wo.session_id = p_session_id 
    AND wo.status = 'Reserved'
    LIMIT 1;
    
    IF v_existing_order.id IS NOT NULL THEN
        -- Return existing reserved order
        RETURN QUERY SELECT v_existing_order.order_number, v_existing_order.id;
        RETURN;
    END IF;
    
    -- Get next order number using a sequence (create if not exists)
    IF NOT EXISTS (SELECT 1 FROM pg_sequences WHERE schemaname = 'public' AND sequencename = 'web_orders_number_seq') THEN
        -- Find the current max order number and start from there
        SELECT COALESCE(MAX(wo.order_number), 750100) INTO v_order_number FROM public.web_orders wo;
        EXECUTE format('CREATE SEQUENCE public.web_orders_number_seq START WITH %s', v_order_number + 1);
    END IF;
    
    -- Get next value from sequence
    v_order_number := nextval('public.web_orders_number_seq');
    
    -- Insert the reserved order
    INSERT INTO public.web_orders (
        order_number,
        account_number,
        session_id,
        status,
        reserved_at,
        created_at,
        order_items,
        subtotal,
        grand_total
    ) VALUES (
        v_order_number,
        p_account_number,
        p_session_id,
        'Reserved',
        NOW(),
        NOW(),
        '[]'::jsonb,
        0,
        0
    ) RETURNING id INTO v_order_id;
    
    RETURN QUERY SELECT v_order_number, v_order_id;
END;
$$;

-- Create function to complete an order (transition from Reserved to Pending Confirmation)
CREATE OR REPLACE FUNCTION public.complete_order(
    p_session_id TEXT,
    p_order_items JSONB,
    p_order_comments TEXT,
    p_subtotal NUMERIC,
    p_discount_percentage NUMERIC,
    p_discount_amount NUMERIC,
    p_grand_total NUMERIC,
    p_shipping_info JSONB DEFAULT NULL
)
RETURNS TABLE(success BOOLEAN, order_number INTEGER, order_id INTEGER, message TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_order RECORD;
BEGIN
    -- Find the reserved order for this session
    SELECT wo.id, wo.order_number INTO v_order
    FROM public.web_orders wo
    WHERE wo.session_id = p_session_id 
    AND wo.status = 'Reserved'
    LIMIT 1;
    
    IF v_order.id IS NULL THEN
        RETURN QUERY SELECT FALSE, NULL::INTEGER, NULL::INTEGER, 'No reserved order found for this session'::TEXT;
        RETURN;
    END IF;
    
    -- Update the order with checkout details
    UPDATE public.web_orders SET
        order_items = p_order_items,
        order_comments = p_order_comments,
        subtotal = p_subtotal,
        discount_percentage = p_discount_percentage,
        discount_amount = p_discount_amount,
        grand_total = p_grand_total,
        status = 'Pending Confirmation',
        completed_at = NOW(),
        updated_at = NOW()
    WHERE id = v_order.id;
    
    -- Handle shipping info if provided
    IF p_shipping_info IS NOT NULL THEN
        UPDATE public.web_orders SET
            shipping_first_name = p_shipping_info->>'first_name',
            shipping_last_name = p_shipping_info->>'last_name',
            shipping_company = p_shipping_info->>'company',
            shipping_address = p_shipping_info->>'address',
            shipping_city = p_shipping_info->>'city',
            shipping_state = p_shipping_info->>'state',
            shipping_zip_code = p_shipping_info->>'zip_code',
            shipping_phone = p_shipping_info->>'phone'
        WHERE id = v_order.id;
    END IF;
    
    RETURN QUERY SELECT TRUE, v_order.order_number, v_order.id, 'Order completed successfully'::TEXT;
END;
$$;

-- Create function to abandon stale orders (for cleanup job)
CREATE OR REPLACE FUNCTION public.abandon_stale_orders()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_count INTEGER;
BEGIN
    UPDATE public.web_orders SET
        status = 'Abandoned',
        abandoned_at = NOW(),
        updated_at = NOW()
    WHERE status = 'Reserved'
    AND reserved_at < NOW() - INTERVAL '12 hours';
    
    GET DIAGNOSTICS v_count = ROW_COUNT;
    RETURN v_count;
END;
$$;

-- Create the legacy function for backward compatibility (will use reservation system internally)
CREATE OR REPLACE FUNCTION public.get_next_order_number()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_order_number INTEGER;
BEGIN
    -- This is a fallback for direct calls - should use reserve_order_number instead
    v_order_number := nextval('public.web_orders_number_seq');
    RETURN v_order_number;
END;
$$;

-- Add RLS policies for the new functions
GRANT EXECUTE ON FUNCTION public.reserve_order_number TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.complete_order TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.abandon_stale_orders TO service_role;
GRANT EXECUTE ON FUNCTION public.get_next_order_number TO authenticated, anon;

-- Create a scheduled job for cleanup (requires pg_cron extension)
-- This would run every hour to clean up abandoned orders
-- Note: pg_cron must be enabled in Supabase dashboard
/*
SELECT cron.schedule(
    'cleanup-abandoned-orders',
    '0 * * * *', -- Every hour
    'SELECT public.abandon_stale_orders();'
);
*/