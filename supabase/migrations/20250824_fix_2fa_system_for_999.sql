-- Fix 2FA system for account 999
-- This migration populates sms_admins table and tests the 2FA system

-- Step 1: Populate sms_admins table with admin phone numbers
INSERT INTO public.sms_admins (phone_number, is_active, notes) VALUES 
  ('+15164550980', true, 'Primary admin'),
  ('+15164107455', true, 'Secondary admin'), 
  ('+15167650816', true, 'Tertiary admin')
ON CONFLICT (phone_number) DO UPDATE SET 
  is_active = EXCLUDED.is_active,
  notes = EXCLUDED.notes;

-- Verify the sms_admins table is populated
SELECT 'Step 1 Complete: SMS Admins populated' as status;
SELECT * FROM public.sms_admins WHERE is_active = true;

-- Step 2: Test the 2FA code generation function
SELECT 'Step 2: Testing 2FA code generation' as status;
SELECT public.generate_2fa_code(999, '127.0.0.1', 'test-browser') as result;

-- Step 3: Check if the code was inserted
SELECT 'Step 3: Checking admin_logins table' as status;
SELECT * FROM public.admin_logins WHERE account_number = 999 ORDER BY created_at DESC LIMIT 3;

-- Additional verification: Check if two_factor_codes table also has entries (backward compatibility)
SELECT 'Additional: Checking two_factor_codes table for backward compatibility' as status;
SELECT * FROM public.two_factor_codes WHERE account_number = 999 ORDER BY created_at DESC LIMIT 3;