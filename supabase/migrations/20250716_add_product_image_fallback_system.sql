-- Add product image fallback system
-- This migration creates a function to find fallback images for products without photos

-- Create function to get fallback image for products without images
CREATE OR REPLACE FUNCTION get_fallback_image_for_product(
    input_partnumber TEXT,
    input_brand TEXT,
    input_prdmaincat TEXT, 
    input_prdsubcat TEXT
) RETURNS TEXT AS $$
DECLARE
    fallback_image TEXT;
    base_partnumber TEXT;
    first_part TEXT;
    second_part TEXT;
    hyphen_pos1 INTEGER;
    hyphen_pos2 INTEGER;
BEGIN
    -- Return null if any required parameters are null
    IF input_partnumber IS NULL OR input_brand IS NULL OR input_prdmaincat IS NULL OR input_prdsubcat IS NULL THEN
        RETURN NULL;
    END IF;

    -- Find positions of first and second hyphens
    hyphen_pos1 := POSITION('-' IN input_partnumber);
    
    IF hyphen_pos1 > 0 THEN
        -- Get first part before first hyphen
        first_part := SUBSTRING(input_partnumber FROM 1 FOR hyphen_pos1 - 1);
        
        -- Find second hyphen position (after first hyphen)
        hyphen_pos2 := POSITION('-' IN SUBSTRING(input_partnumber FROM hyphen_pos1 + 1));
        
        IF hyphen_pos2 > 0 THEN
            -- Get base partnumber (first two parts: "BAG-123" from "BAG-123-RED")
            base_partnumber := SUBSTRING(input_partnumber FROM 1 FOR hyphen_pos1 + hyphen_pos2 - 1);
            
            -- Try to find a product with same brand, categories, and matching first 2 parts of partnumber
            SELECT COALESCE(p.groupedimage, r.image_name)
            INTO fallback_image
            FROM products_supabase p
            LEFT JOIN rt_extended r ON p.partnumber = r.partnumber
            WHERE p.brand = input_brand
              AND p.prdmaincat = input_prdmaincat
              AND p.prdsubcat = input_prdsubcat
              AND p.partnumber != input_partnumber  -- Don't match the same product
              AND p.partnumber LIKE (base_partnumber || '%')
              AND (p.groupedimage IS NOT NULL OR r.image_name IS NOT NULL)
            ORDER BY 
              CASE WHEN p.groupedimage IS NOT NULL THEN 1 ELSE 2 END,  -- Prefer groupedimage over rt_extended
              p.partnumber
            LIMIT 1;
            
            -- If found, return it
            IF fallback_image IS NOT NULL THEN
                RETURN fallback_image;
            END IF;
        END IF;
        
        -- If no match with 2 parts, try matching just the first part ("BAG" from "BAG-123-RED")
        SELECT COALESCE(p.groupedimage, r.image_name)
        INTO fallback_image
        FROM products_supabase p
        LEFT JOIN rt_extended r ON p.partnumber = r.partnumber
        WHERE p.brand = input_brand
          AND p.prdmaincat = input_prdmaincat
          AND p.prdsubcat = input_prdsubcat
          AND p.partnumber != input_partnumber  -- Don't match the same product
          AND p.partnumber LIKE (first_part || '%')
          AND (p.groupedimage IS NOT NULL OR r.image_name IS NOT NULL)
        ORDER BY 
          CASE WHEN p.groupedimage IS NOT NULL THEN 1 ELSE 2 END,  -- Prefer groupedimage over rt_extended
          p.partnumber
        LIMIT 1;
        
        -- If found, return it
        IF fallback_image IS NOT NULL THEN
            RETURN fallback_image;
        END IF;
    END IF;
    
    -- If no hyphen-based matches, try to find any product with same brand and categories that has an image
    SELECT COALESCE(p.groupedimage, r.image_name)
    INTO fallback_image
    FROM products_supabase p
    LEFT JOIN rt_extended r ON p.partnumber = r.partnumber
    WHERE p.brand = input_brand
      AND p.prdmaincat = input_prdmaincat
      AND p.prdsubcat = input_prdsubcat
      AND p.partnumber != input_partnumber  -- Don't match the same product
      AND (p.groupedimage IS NOT NULL OR r.image_name IS NOT NULL)
    ORDER BY 
      CASE WHEN p.groupedimage IS NOT NULL THEN 1 ELSE 2 END,  -- Prefer groupedimage over rt_extended
      p.partnumber
    LIMIT 1;
    
    RETURN fallback_image;
END;
$$ LANGUAGE plpgsql;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_fallback_image_for_product(TEXT, TEXT, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION get_fallback_image_for_product(TEXT, TEXT, TEXT, TEXT) TO anon;

-- Add comment for documentation
COMMENT ON FUNCTION get_fallback_image_for_product(TEXT, TEXT, TEXT, TEXT) IS 
'Finds a fallback image for products without photos by looking for similar products with same brand, categories, and matching partnumber patterns';
