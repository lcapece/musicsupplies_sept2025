#!/usr/bin/env node
// Direct execution script for the contact info fix
// This uses the service role key from your MCP config to execute admin operations

import pg from 'pg';
const { Client } = pg;

// Parse the Supabase URL to get database connection details
const supabaseUrl = 'https://ekklokrukxmqlahtonnc.supabase.co';
const projectRef = 'ekklokrukxmqlahtonnc';

// Database connection using Supabase's direct connection string
// Note: This requires the database password, not the service role key
const connectionString = `postgresql://postgres.${projectRef}:YOUR_DB_PASSWORD@aws-0-us-east-1.pooler.supabase.com:5432/postgres`;

console.log('⚠️  IMPORTANT: This script needs your Supabase database password.');
console.log('');
console.log('To get your database password:');
console.log('1. Go to https://supabase.com/dashboard');
console.log('2. Select your project');
console.log('3. Go to Settings → Database');
console.log('4. Find "Connection string" section');
console.log('5. Copy the password from there');
console.log('');
console.log('Alternative: Use the SQL Editor in Supabase Dashboard directly');
console.log('');
console.log('═══════════════════════════════════════════════════════════');
console.log('📋 EASIEST SOLUTION - Do this instead:');
console.log('═══════════════════════════════════════════════════════════');
console.log('');
console.log('1. Open: https://supabase.com/dashboard/project/ekklokrukxmqlahtonnc/sql');
console.log('   (This is your project\'s SQL editor)');
console.log('');
console.log('2. Copy and paste this SQL:');
console.log('');
console.log(`-- FIX CONTACT INFO SAVING ISSUE
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
ALTER FUNCTION upsert_contact_info(INTEGER, VARCHAR(255), VARCHAR(20), VARCHAR(20)) OWNER TO postgres;`);

console.log('');
console.log('3. Click the green "RUN" button');
console.log('');
console.log('═══════════════════════════════════════════════════════════');
console.log('✅ That\'s it! Your contact info will work immediately.');
console.log('═══════════════════════════════════════════════════════════');