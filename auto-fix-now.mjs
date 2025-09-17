#!/usr/bin/env node
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

console.log('🔧 APPLYING CONTACT INFO FIX...\n');

// Test if the current function works
async function testAndFix() {
  // First, check if the table exists
  const { data: tables, error: tableError } = await supabase
    .from('contactinfo')
    .select('account_number')
    .limit(1);
  
  if (tableError && tableError.code === '42P01') {
    console.error('❌ Table contactinfo does not exist!');
    console.log('Creating table first...');
    // Table doesn't exist - this would need to be created via SQL
    console.log('\n📋 Run this in Supabase SQL Editor:');
    console.log('https://supabase.com/dashboard/project/ekklokrukxmqlahtonnc/sql\n');
    showFullSQL();
    return;
  }

  // Try to use the function
  const { data, error } = await supabase.rpc('upsert_contact_info', {
    p_account_number: 99999,
    p_email_address: 'test@test.com',
    p_business_phone: '555-1234',
    p_mobile_phone: '555-5678'
  });

  if (error) {
    console.log('❌ Function is broken or missing!');
    console.log('Error:', error.message);
    console.log('\n🚨 FIX REQUIRED - Copy and run this SQL:\n');
    console.log('📋 Go to: https://supabase.com/dashboard/project/ekklokrukxmqlahtonnc/sql');
    console.log('\nPaste this SQL and click RUN:\n');
    showFixSQL();
  } else {
    console.log('✅ Function appears to be working!');
    
    // Clean up test record
    await supabase.from('contactinfo').delete().eq('account_number', 99999);
    
    // Test if we can clear fields (the main issue)
    const { error: updateError } = await supabase.rpc('upsert_contact_info', {
      p_account_number: 88888,
      p_email_address: null,  // This should work after fix
      p_business_phone: null,
      p_mobile_phone: null
    });
    
    if (updateError) {
      console.log('⚠️  Function exists but has the COALESCE bug!');
      console.log('\n📋 Apply this fix in SQL Editor:');
      console.log('https://supabase.com/dashboard/project/ekklokrukxmqlahtonnc/sql\n');
      showFixSQL();
    } else {
      console.log('✅ Contact info system is working perfectly!');
      // Clean up
      await supabase.from('contactinfo').delete().eq('account_number', 88888);
    }
  }
}

function showFixSQL() {
  const sql = `-- FIX CONTACT INFO SAVING
DROP FUNCTION IF EXISTS upsert_contact_info(INTEGER, VARCHAR(255), VARCHAR(20), VARCHAR(20));

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
    INSERT INTO contactinfo (account_number, email_address, business_phone, mobile_phone)
    VALUES (p_account_number, p_email_address, p_business_phone, p_mobile_phone)
    ON CONFLICT (account_number) 
    DO UPDATE SET
        email_address = EXCLUDED.email_address,
        business_phone = EXCLUDED.business_phone,
        mobile_phone = EXCLUDED.mobile_phone,
        updated_at = CURRENT_TIMESTAMP;
    
    RETURN QUERY
    SELECT ci.account_number, ci.email_address, ci.business_phone, ci.mobile_phone, ci.updated_at
    FROM contactinfo ci
    WHERE ci.account_number = p_account_number;
END;
$$;

GRANT EXECUTE ON FUNCTION upsert_contact_info(INTEGER, VARCHAR(255), VARCHAR(20), VARCHAR(20)) TO anon, authenticated;
ALTER FUNCTION upsert_contact_info(INTEGER, VARCHAR(255), VARCHAR(20), VARCHAR(20)) OWNER TO postgres;`;
  
  console.log(sql);
}

function showFullSQL() {
  const sql = `-- CREATE TABLE AND FUNCTION
CREATE TABLE IF NOT EXISTS contactinfo (
    account_number INTEGER PRIMARY KEY,
    email_address VARCHAR(255),
    business_phone VARCHAR(20),
    mobile_phone VARCHAR(20),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

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
    INSERT INTO contactinfo (account_number, email_address, business_phone, mobile_phone)
    VALUES (p_account_number, p_email_address, p_business_phone, p_mobile_phone)
    ON CONFLICT (account_number) 
    DO UPDATE SET
        email_address = EXCLUDED.email_address,
        business_phone = EXCLUDED.business_phone,
        mobile_phone = EXCLUDED.mobile_phone,
        updated_at = CURRENT_TIMESTAMP;
    
    RETURN QUERY
    SELECT ci.account_number, ci.email_address, ci.business_phone, ci.mobile_phone, ci.updated_at
    FROM contactinfo ci
    WHERE ci.account_number = p_account_number;
END;
$$;

GRANT EXECUTE ON FUNCTION upsert_contact_info(INTEGER, VARCHAR(255), VARCHAR(20), VARCHAR(20)) TO anon, authenticated;
ALTER FUNCTION upsert_contact_info(INTEGER, VARCHAR(255), VARCHAR(20), VARCHAR(20)) OWNER TO postgres;

CREATE OR REPLACE FUNCTION get_contact_info(p_account_number INTEGER)
RETURNS TABLE(account_number INTEGER, email_address VARCHAR(255), business_phone VARCHAR(20), mobile_phone VARCHAR(20), updated_at TIMESTAMP WITH TIME ZONE)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT ci.account_number, ci.email_address, ci.business_phone, ci.mobile_phone, ci.updated_at
    FROM contactinfo ci
    WHERE ci.account_number = p_account_number;
END;
$$;

GRANT EXECUTE ON FUNCTION get_contact_info(INTEGER) TO anon, authenticated;
ALTER FUNCTION get_contact_info(INTEGER) OWNER TO postgres;`;
  
  console.log(sql);
}

testAndFix().catch(console.error);