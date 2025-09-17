#!/usr/bin/env node
// Emergency script to test and guide fixing the contact info issue
// Run with: node run-fix-now.mjs

import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { readFileSync } from 'fs';

config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing environment variables!');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

console.log('🔍 Testing Contact Info System...\n');

async function testContactInfo() {
  // Test if the function exists and what error we get
  const testAccountNumber = 48342; // Using the account from your previous issue
  
  console.log(`Testing with account ${testAccountNumber}...`);
  
  // Try to call the upsert function
  const { data, error } = await supabase
    .rpc('upsert_contact_info', {
      p_account_number: testAccountNumber,
      p_email_address: 'test@musictest.com',
      p_business_phone: '555-0100',
      p_mobile_phone: '555-0200'
    });
  
  if (error) {
    console.error('❌ Error detected:', error.message);
    console.error('Error code:', error.code);
    console.error('Full error:', JSON.stringify(error, null, 2));
    
    if (error.code === 'PGRST202') {
      console.log('\n⚠️  The upsert_contact_info function does not exist!');
      console.log('📋 You need to create it first.\n');
    } else if (error.code === '42501') {
      console.log('\n⚠️  Permission denied!');
      console.log('📋 The function exists but lacks proper permissions.\n');
    } else {
      console.log('\n⚠️  The function exists but has a logic error!');
      console.log('📋 This is likely the COALESCE issue we identified.\n');
    }
    
    showFixInstructions();
  } else {
    console.log('✅ Function call succeeded!');
    console.log('Data returned:', data);
    
    // Try to retrieve the data
    const { data: checkData, error: checkError } = await supabase
      .rpc('get_contact_info', { p_account_number: testAccountNumber });
    
    if (checkError) {
      console.error('❌ Error retrieving data:', checkError.message);
    } else {
      console.log('✅ Retrieved contact info:', checkData);
    }
  }
}

function showFixInstructions() {
  console.log('═══════════════════════════════════════════════════════');
  console.log('🚨 IMMEDIATE ACTION REQUIRED - FIX CONTACT INFO');
  console.log('═══════════════════════════════════════════════════════\n');
  
  console.log('📋 STEP-BY-STEP INSTRUCTIONS:\n');
  
  console.log('1️⃣  Open Supabase Dashboard:');
  console.log('   https://supabase.com/dashboard\n');
  
  console.log('2️⃣  Select your project (musicsupplies)\n');
  
  console.log('3️⃣  Click "SQL Editor" in the left sidebar\n');
  
  console.log('4️⃣  Copy ALL the contents from this file:');
  console.log('   👉 fix_contactinfo_urgent.sql\n');
  
  console.log('5️⃣  Paste the ENTIRE script into the SQL Editor\n');
  
  console.log('6️⃣  Click the "RUN" button (green button)\n');
  
  console.log('7️⃣  You should see success messages in the output\n');
  
  console.log('═══════════════════════════════════════════════════════');
  console.log('📁 The fix is located at:');
  console.log(`   ${process.cwd()}/fix_contactinfo_urgent.sql`);
  console.log('═══════════════════════════════════════════════════════\n');
  
  // Also show the actual SQL content for immediate copy-paste
  try {
    const sqlContent = readFileSync('fix_contactinfo_urgent.sql', 'utf8');
    console.log('📋 HERE IS THE SQL TO COPY AND PASTE:\n');
    console.log('```sql');
    console.log(sqlContent);
    console.log('```\n');
  } catch (err) {
    console.log('ℹ️  Open fix_contactinfo_urgent.sql to get the SQL code');
  }
}

// Run the test
testContactInfo().catch(console.error);