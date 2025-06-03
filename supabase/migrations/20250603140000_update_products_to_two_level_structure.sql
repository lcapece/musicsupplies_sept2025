/*
  # Update products to use 2-level category structure
  
  This migration documents that the prdmetacat column has been dropped from lcmd_products table
  and the system now uses the 2-level structure defined in rt_productgroups table:
  - Level 1: PrdMainGrp (Main Groups)
  - Level 2: PrdSubGrp (Sub Groups)
  
  The products are now categorized using:
  - prdmaincat: Maps to PrdMainGrp in rt_productgroups
  - prdsubcat: Maps to PrdSubGrp in rt_productgroups
*/

-- Add comment to document the structure change
COMMENT ON TABLE lcmd_products IS 
'Products table using 2-level category structure. Categories are defined in rt_productgroups table.';

COMMENT ON COLUMN lcmd_products.prdmaincat IS 
'Main product category - corresponds to PrdMainGrp in rt_productgroups';

COMMENT ON COLUMN lcmd_products.prdsubcat IS 
'Sub product category - corresponds to PrdSubGrp in rt_productgroups';
