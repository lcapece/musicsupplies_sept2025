-- Function to get all available promo codes for a user with their potential savings
CREATE OR REPLACE FUNCTION get_available_promo_codes(
  p_account_number TEXT,
  p_order_value DECIMAL
)
RETURNS TABLE (
  code TEXT,
  name TEXT,
  description TEXT,
  type TEXT,
  value DECIMAL,
  min_order_value DECIMAL,
  discount_amount DECIMAL,
  is_best BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_best_discount DECIMAL := 0;
BEGIN
  -- First pass to determine the best discount
  SELECT MAX(
    CASE 
      WHEN pc.type = 'percent_off' THEN 
        CASE 
          WHEN p_order_value >= pc.min_order_value THEN p_order_value * (pc.value / 100.0)
          ELSE 0
        END
      ELSE -- dollars_off
        CASE 
          WHEN p_order_value >= pc.min_order_value THEN 
            CASE
              WHEN pc.value > p_order_value THEN p_order_value
              ELSE pc.value
            END
          ELSE 0
        END
    END
  ) INTO v_best_discount
  FROM promo_codes pc
  WHERE pc.is_active = TRUE
    AND pc.start_date <= CURRENT_TIMESTAMP
    AND pc.end_date >= CURRENT_TIMESTAMP
    AND (pc.max_uses IS NULL OR pc.uses_remaining > 0);

  -- Return all promo codes with their potential discount and whether they're the best
  RETURN QUERY
  SELECT
    pc.code,
    pc.name,
    'Save ' || 
      CASE 
        WHEN pc.type = 'percent_off' THEN pc.value::TEXT || '%'
        ELSE '$' || pc.value::TEXT
      END ||
      CASE
        WHEN pc.min_order_value > 0 THEN ' on orders over $' || pc.min_order_value::TEXT
        ELSE ''
      END ||
      CASE
        WHEN pc.max_uses IS NOT NULL THEN ' (Limited time offer)'
        ELSE ''
      END as description,
    pc.type,
    pc.value,
    pc.min_order_value,
    CASE 
      WHEN pc.type = 'percent_off' THEN 
        CASE 
          WHEN p_order_value >= pc.min_order_value THEN p_order_value * (pc.value / 100.0)
          ELSE 0
        END
      ELSE -- dollars_off
        CASE 
          WHEN p_order_value >= pc.min_order_value THEN 
            CASE
              WHEN pc.value > p_order_value THEN p_order_value
              ELSE pc.value
            END
          ELSE 0
        END
    END as discount_amount,
    CASE 
      WHEN CASE 
        WHEN pc.type = 'percent_off' THEN 
          CASE 
            WHEN p_order_value >= pc.min_order_value THEN p_order_value * (pc.value / 100.0)
            ELSE 0
          END
        ELSE -- dollars_off
          CASE 
            WHEN p_order_value >= pc.min_order_value THEN 
              CASE
                WHEN pc.value > p_order_value THEN p_order_value
                ELSE pc.value
              END
            ELSE 0
          END
      END = v_best_discount AND v_best_discount > 0 THEN TRUE
      ELSE FALSE
    END as is_best
  FROM promo_codes pc
  WHERE pc.is_active = TRUE
    AND pc.start_date <= CURRENT_TIMESTAMP
    AND pc.end_date >= CURRENT_TIMESTAMP
    AND (pc.max_uses IS NULL OR pc.uses_remaining > 0)
  ORDER BY
    discount_amount DESC,
    pc.code ASC;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION get_available_promo_codes TO anon, authenticated;
