-- Create the staging table for SKU imports
CREATE TABLE IF NOT EXISTS public.stg_update_skus (
  id SERIAL PRIMARY KEY,
  sku VARCHAR(50) NOT NULL,
  description TEXT,
  price DECIMAL(10, 2),
  cost DECIMAL(10, 2),
  category VARCHAR(100),
  subcategory VARCHAR(100),
  brand VARCHAR(100),
  upc VARCHAR(50),
  imported_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  imported_by VARCHAR(50)
);

-- Create a function to validate SKUs in the staging table
CREATE OR REPLACE FUNCTION public.validate_stg_update_skus()
RETURNS TABLE(is_valid BOOLEAN, message TEXT) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  empty_sku_count INTEGER;
  duplicate_sku_count INTEGER;
BEGIN
  -- Check for empty SKUs
  SELECT COUNT(*) INTO empty_sku_count
  FROM public.stg_update_skus
  WHERE sku IS NULL OR TRIM(sku) = '';
  
  -- Check for duplicate SKUs
  SELECT COUNT(*) - COUNT(DISTINCT sku) INTO duplicate_sku_count
  FROM public.stg_update_skus
  WHERE sku IS NOT NULL AND TRIM(sku) <> '';
  
  -- Return validation results
  IF empty_sku_count > 0 OR duplicate_sku_count > 0 THEN
    RETURN QUERY SELECT 
      FALSE as is_valid, 
      CASE 
        WHEN empty_sku_count > 0 AND duplicate_sku_count > 0 
          THEN 'Found ' || empty_sku_count || ' empty SKUs and ' || duplicate_sku_count || ' duplicate SKUs'
        WHEN empty_sku_count > 0 
          THEN 'Found ' || empty_sku_count || ' empty SKUs'
        ELSE 'Found ' || duplicate_sku_count || ' duplicate SKUs'
      END as message;
  ELSE
    RETURN QUERY SELECT TRUE as is_valid, 'All SKUs are unique and non-empty' as message;
  END IF;
END;
$$;

-- Add policy for stg_update_skus table
ALTER TABLE public.stg_update_skus ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to access the table
CREATE POLICY stg_update_skus_policy ON public.stg_update_skus
  FOR ALL USING (auth.uid() IS NOT NULL);
