-- This migration adds a function to properly handle NULL webmsrp values
-- When querying the products table

-- First create or replace the function
CREATE OR REPLACE FUNCTION format_webmsrp(webmsrp float4)
RETURNS text AS $$
BEGIN
  IF webmsrp IS NULL THEN
    RETURN '---';
  ELSE
    RETURN CONCAT('$', webmsrp::text);
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Create a view that will format webmsrp properly
CREATE OR REPLACE VIEW products_with_formatted_msrp AS
SELECT 
  partnumber,
  description,
  price,
  inventory,
  prdmaingrp,
  prdsubgrp,
  format_webmsrp(webmsrp) as formatted_msrp,
  webmsrp,
  longdescription
FROM products_supabase;

-- Grant appropriate permissions
GRANT SELECT ON products_with_formatted_msrp TO authenticated;
GRANT SELECT ON products_with_formatted_msrp TO anon;
