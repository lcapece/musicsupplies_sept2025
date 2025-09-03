-- ========================================
-- FIX ORDER_ITEMS JSON FORMATTING ISSUE
-- ========================================
-- This migration ensures ORDER_ITEMS is always stored as a single valid JSON array
-- instead of concatenated arrays like [{item1}][{item2}]
-- ========================================

-- Step 1: Create function to validate and auto-fix JSON array formatting
CREATE OR REPLACE FUNCTION validate_and_fix_order_items()
RETURNS TRIGGER AS $$
BEGIN
    -- Check if ORDER_ITEMS exists and is not null
    IF NEW.order_items IS NOT NULL THEN
        -- Check if the value is already a valid JSON array
        IF jsonb_typeof(NEW.order_items) = 'array' THEN
            -- It's already a proper array, do nothing
            RETURN NEW;
        ELSE
            -- Log the issue for debugging
            RAISE WARNING 'Invalid ORDER_ITEMS format detected for order %, attempting to fix', NEW.id;
            
            -- Try to parse as text and fix concatenated arrays
            DECLARE
                items_text TEXT;
                fixed_items JSONB;
            BEGIN
                items_text := NEW.order_items::TEXT;
                
                -- Check if it looks like concatenated arrays
                IF items_text LIKE '%]%[%' THEN
                    -- Remove spaces between arrays and merge them
                    items_text := regexp_replace(items_text, '\]\s*\[', ',', 'g');
                    
                    -- Try to parse the fixed JSON
                    fixed_items := items_text::JSONB;
                    NEW.order_items := fixed_items;
                    
                    RAISE WARNING 'Fixed concatenated arrays for order %', NEW.id;
                END IF;
                
            EXCEPTION WHEN OTHERS THEN
                -- If we can't fix it, raise an error
                RAISE EXCEPTION 'Invalid ORDER_ITEMS JSON format: %', SQLERRM;
            END;
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Step 2: Create trigger to validate ORDER_ITEMS before insert or update
DROP TRIGGER IF EXISTS validate_order_items_trigger ON web_orders;
CREATE TRIGGER validate_order_items_trigger
    BEFORE INSERT OR UPDATE OF order_items ON web_orders
    FOR EACH ROW
    EXECUTE FUNCTION validate_and_fix_order_items();

-- Step 3: Update the complete_order function to ensure proper JSON array formatting
CREATE OR REPLACE FUNCTION complete_order(
    p_id INT,
    p_order_items JSONB,
    p_order_comments TEXT DEFAULT NULL,
    p_promo_code TEXT DEFAULT NULL,
    p_original_total NUMERIC DEFAULT NULL,
    p_discount_amount NUMERIC DEFAULT 0,
    p_final_total NUMERIC DEFAULT NULL
) RETURNS JSONB AS $$
DECLARE
    v_result JSONB;
    v_order RECORD;
    v_promo RECORD;
    v_fixed_items JSONB;
BEGIN
    -- Validate that p_order_items is a proper JSON array
    IF jsonb_typeof(p_order_items) != 'array' THEN
        -- Try to fix if it's concatenated arrays (as text)
        DECLARE
            items_text TEXT;
        BEGIN
            items_text := p_order_items::TEXT;
            IF items_text LIKE '%]%[%' THEN
                items_text := regexp_replace(items_text, '\]\s*\[', ',', 'g');
                v_fixed_items := items_text::JSONB;
            ELSE
                v_fixed_items := p_order_items;
            END IF;
        EXCEPTION WHEN OTHERS THEN
            v_fixed_items := p_order_items;
        END;
    ELSE
        v_fixed_items := p_order_items;
    END IF;
    
    -- Ensure we have a valid array
    IF jsonb_typeof(v_fixed_items) != 'array' THEN
        RAISE EXCEPTION 'ORDER_ITEMS must be a valid JSON array';
    END IF;
    
    -- Get the pre-allocated order
    SELECT * INTO v_order FROM public.web_orders WHERE id = p_id;
    
    IF v_order IS NULL THEN
        RETURN jsonb_build_object(
            'success', false,
            'message', 'Order not found'
        );
    END IF;
    
    -- Check if order is already completed
    IF v_order.status != 'allocated' THEN
        RETURN jsonb_build_object(
            'success', false,
            'message', 'Order is not in allocated status'
        );
    END IF;
    
    -- Handle promo code if provided
    IF p_promo_code IS NOT NULL AND p_promo_code != '' THEN
        SELECT * INTO v_promo FROM public.promo_codes 
        WHERE code = p_promo_code 
        AND is_active = true 
        AND (expires_at IS NULL OR expires_at > NOW());
        
        IF v_promo IS NOT NULL THEN
            -- Check usage limits
            IF v_promo.max_uses IS NOT NULL AND v_promo.times_used >= v_promo.max_uses THEN
                -- Don't fail the order, just don't apply the discount
                v_promo := NULL;
            ELSE
                -- Increment usage count
                UPDATE public.promo_codes 
                SET times_used = times_used + 1,
                    last_used_at = NOW()
                WHERE id = v_promo.id;
            END IF;
        END IF;
    END IF;
    
    -- Update the order with the properly formatted items
    UPDATE public.web_orders SET
        order_items = v_fixed_items,  -- Use the validated/fixed items
        order_comments = p_order_comments,
        promo_code_used = CASE WHEN v_promo IS NOT NULL THEN p_promo_code ELSE NULL END,
        promo_discount_percent = CASE WHEN v_promo IS NOT NULL THEN v_promo.discount_percent ELSE NULL END,
        original_total = p_original_total,
        discount_amount = CASE WHEN v_promo IS NOT NULL THEN p_discount_amount ELSE 0 END,
        final_total = p_final_total,
        order_date = NOW(),
        status = 'pending',
        updated_at = NOW()
    WHERE id = p_id;
    
    -- Return success with order details
    RETURN jsonb_build_object(
        'success', true,
        'message', 'Order completed successfully',
        'order_id', p_id,
        'promo_applied', v_promo IS NOT NULL,
        'discount_percent', CASE WHEN v_promo IS NOT NULL THEN v_promo.discount_percent ELSE 0 END
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 4: Add constraint to ensure ORDER_ITEMS is always a valid JSON array (if not null)
ALTER TABLE web_orders DROP CONSTRAINT IF EXISTS order_items_must_be_array;
ALTER TABLE web_orders ADD CONSTRAINT order_items_must_be_array 
    CHECK (order_items IS NULL OR jsonb_typeof(order_items) = 'array');

-- Step 5: Create function to fix existing malformed ORDER_ITEMS data
CREATE OR REPLACE FUNCTION fix_existing_order_items()
RETURNS VOID AS $$
DECLARE
    r RECORD;
    fixed_items JSONB;
    items_text TEXT;
BEGIN
    FOR r IN 
        SELECT id, order_items 
        FROM web_orders 
        WHERE order_items IS NOT NULL 
        AND jsonb_typeof(order_items) != 'array'
    LOOP
        BEGIN
            items_text := r.order_items::TEXT;
            
            -- Check if it looks like concatenated arrays
            IF items_text LIKE '%]%[%' THEN
                -- Remove spaces/newlines between arrays and merge them
                items_text := regexp_replace(items_text, '\]\s*\[', ',', 'g');
                fixed_items := items_text::JSONB;
                
                -- Update the record with fixed JSON
                UPDATE web_orders 
                SET order_items = fixed_items 
                WHERE id = r.id;
                
                RAISE NOTICE 'Fixed ORDER_ITEMS for order ID %', r.id;
            END IF;
        EXCEPTION WHEN OTHERS THEN
            RAISE WARNING 'Could not fix ORDER_ITEMS for order ID %: %', r.id, SQLERRM;
        END;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Step 6: Fix any existing malformed data
SELECT fix_existing_order_items();

-- Step 7: Add comments explaining the fix
COMMENT ON FUNCTION validate_and_fix_order_items() IS 
'Ensures ORDER_ITEMS is stored as a single valid JSON array, fixing concatenated arrays if detected';

COMMENT ON FUNCTION complete_order(INT, JSONB, TEXT, TEXT, NUMERIC, NUMERIC, NUMERIC) IS 
'Completes a pre-allocated order with validated JSON array formatting for ORDER_ITEMS';

-- ========================================
-- VERIFICATION QUERIES
-- ========================================
-- After applying this migration, run these queries to verify:

-- Check if any orders still have invalid JSON format:
-- SELECT id, order_items::text FROM web_orders WHERE order_items IS NOT NULL AND jsonb_typeof(order_items) != 'array';

-- Check the trigger exists:
-- SELECT tgname FROM pg_trigger WHERE tgname = 'validate_order_items_trigger';

-- Check the constraint exists:
-- SELECT conname FROM pg_constraint WHERE conname = 'order_items_must_be_array';
