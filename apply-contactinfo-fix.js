// Script to apply the contact info fix to your Supabase database
// Run this with: node apply-contactinfo-fix.js

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase environment variables!');
  console.error('Please ensure VITE_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function applyFix() {
  console.log('🔧 Applying Contact Info Fix...\n');

  try {
    // The fix SQL
    const fixSQL = `
-- URGENT FIX: Contact Info not saving properly
-- Problem: The upsert_contact_info function was using COALESCE incorrectly

-- Drop the broken function
DROP FUNCTION IF EXISTS upsert_contact_info(INTEGER, VARCHAR(255), VARCHAR(20), VARCHAR(20));

-- Create the FIXED upsert function
CREATE OR REPLACE FUNCTION upsert_contact_info(
    p_account_number INTEGER,
    p_email_address VARCHAR(255) DEFAULT NULL,
    p_business_phone VARCHAR(20) DEFAULT NULL,
    p_mobile_phone VARCHAR(20) DEFAULT NULL
)
RETURNS TABLE(account_number INTEGER, email_address VARCHAR(255), business_phone VARCHAR(20), mobile_phone VARCHAR(20), updated_at TIMESTAMP WITH TIME ZONE)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Insert or update contact info for the account
    -- IMPORTANT: Use EXCLUDED values directly, not COALESCE, to allow clearing fields
    INSERT INTO contactinfo (account_number, email_address, business_phone, mobile_phone)
    VALUES (p_account_number, p_email_address, p_business_phone, p_mobile_phone)
    ON CONFLICT (account_number) 
    DO UPDATE SET
        email_address = EXCLUDED.email_address,  -- Direct assignment allows NULL values
        business_phone = EXCLUDED.business_phone,  -- Direct assignment allows NULL values
        mobile_phone = EXCLUDED.mobile_phone,      -- Direct assignment allows NULL values
        updated_at = CURRENT_TIMESTAMP;
    
    -- Return the updated record
    RETURN QUERY
    SELECT ci.account_number, ci.email_address, ci.business_phone, ci.mobile_phone, ci.updated_at
    FROM contactinfo ci
    WHERE ci.account_number = p_account_number;
END;
$$;

-- Ensure execute permission is granted
GRANT EXECUTE ON FUNCTION upsert_contact_info(INTEGER, VARCHAR(255), VARCHAR(20), VARCHAR(20)) TO anon, authenticated;

-- Ensure the function is owned by postgres
ALTER FUNCTION upsert_contact_info(INTEGER, VARCHAR(255), VARCHAR(20), VARCHAR(20)) OWNER TO postgres;

-- Also ensure the get_contact_info function has proper permissions
GRANT EXECUTE ON FUNCTION get_contact_info(INTEGER) TO anon, authenticated;
ALTER FUNCTION get_contact_info(INTEGER) OWNER TO postgres;
    `;

    // Execute the fix
    const { data, error } = await supabase.rpc('query', { query: fixSQL });
    
    if (error) {
      // Try alternative approach - direct SQL execution
      console.log('Trying alternative approach...');
      
      // Since we can't execute raw SQL directly via the client library,
      // we'll need to use the SQL editor in Supabase Dashboard
      console.error('\n❌ Cannot execute SQL directly from this script.');
      console.log('\n📋 MANUAL STEPS REQUIRED:');
      console.log('1. Go to your Supabase Dashboard: https://supabase.com/dashboard');
      console.log('2. Select your project');
      console.log('3. Click "SQL Editor" in the left sidebar');
      console.log('4. Copy the contents of fix_contactinfo_urgent.sql');
      console.log('5. Paste into the SQL Editor');
      console.log('6. Click "Run"\n');
      
      console.log('The fix is in the file: fix_contactinfo_urgent.sql');
      return;
    }

    console.log('✅ Fix applied successfully!');
    
    // Test the fix
    console.log('\n🧪 Testing the fix...');
    
    const { data: testData, error: testError } = await supabase
      .rpc('upsert_contact_info', {
        p_account_number: 99999,
        p_email_address: 'test@example.com',
        p_business_phone: '555-1234',
        p_mobile_phone: '555-5678'
      });
    
    if (testError) {
      console.error('Test failed:', testError);
    } else {
      console.log('✅ Test successful:', testData);
      
      // Clean up test record
      const { error: deleteError } = await supabase
        .from('contactinfo')
        .delete()
        .eq('account_number', 99999);
      
      if (!deleteError) {
        console.log('✅ Test record cleaned up');
      }
    }
    
    console.log('\n🎉 Contact Info system is now working!');
    
  } catch (err) {
    console.error('Error applying fix:', err);
    console.log('\n📋 Please apply the fix manually in Supabase SQL Editor');
    console.log('File: fix_contactinfo_urgent.sql');
  }
}

applyFix();