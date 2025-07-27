-- Disable all existing discounts in the lcmd_discount table
UPDATE lcmd_discount
SET is_active = false;

-- Create a trigger to prevent any new discounts from being set to active
CREATE OR REPLACE FUNCTION prevent_active_discounts()
RETURNS TRIGGER AS $$
BEGIN
  NEW.is_active = false;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS prevent_discount_activation ON lcmd_discount;

-- Create a trigger that will force all discounts to be inactive
CREATE TRIGGER prevent_discount_activation
BEFORE INSERT OR UPDATE ON lcmd_discount
FOR EACH ROW
EXECUTE FUNCTION prevent_active_discounts();

-- Create a comment explaining why this change was made
COMMENT ON TABLE lcmd_discount IS 'This table is deprecated. All discounts are now managed through promo codes only.';
