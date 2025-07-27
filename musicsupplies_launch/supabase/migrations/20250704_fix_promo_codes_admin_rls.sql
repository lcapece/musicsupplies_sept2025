-- Fix promo codes RLS policies to use correct admin account number (99)

-- Drop existing admin policies
DROP POLICY IF EXISTS "Admin can manage promo codes" ON promo_codes;
DROP POLICY IF EXISTS "Admin can manage promo code usage" ON promo_code_usage;

-- Create corrected admin policies for promo_codes
CREATE POLICY "Admin can manage promo codes" ON promo_codes
  FOR ALL TO authenticated
  USING (auth.jwt() ->> 'sub' = '99');

-- Create corrected admin policy for promo_code_usage  
CREATE POLICY "Admin can manage promo code usage" ON promo_code_usage
  FOR ALL TO authenticated
  USING (auth.jwt() ->> 'sub' = '99');

-- Also ensure the admin can insert new promo codes
CREATE POLICY "Admin can insert promo codes" ON promo_codes
  FOR INSERT TO authenticated
  WITH CHECK (auth.jwt() ->> 'sub' = '99');

-- Admin can update existing promo codes
CREATE POLICY "Admin can update promo codes" ON promo_codes
  FOR UPDATE TO authenticated
  USING (auth.jwt() ->> 'sub' = '99')
  WITH CHECK (auth.jwt() ->> 'sub' = '99');

-- Admin can delete promo codes
CREATE POLICY "Admin can delete promo codes" ON promo_codes
  FOR DELETE TO authenticated
  USING (auth.jwt() ->> 'sub' = '99');

-- Ensure admin can view all promo codes regardless of status
CREATE POLICY "Admin can view all promo codes" ON promo_codes
  FOR SELECT TO authenticated
  USING (auth.jwt() ->> 'sub' = '99');
