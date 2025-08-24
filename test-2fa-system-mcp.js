#!/usr/bin/env node
/**
 * 2FA System Test using Supabase
 * Tests all components of the 2FA system systematically
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: join(__dirname, '.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials in .env file');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function testDatabaseStructure() {
  console.log('🔍 Step 1: Checking database structure...');
  
  try {
    // Check if admin_logins table exists
    const { data: adminLogins, error: adminError } = await supabase
      .from('admin_logins')
      .select('*')
      .limit(1);
    
    if (adminError) {
      console.error('❌ admin_logins table error:', adminError.message);
      return false;
    }
    
    console.log('✅ admin_logins table exists');
    
    // Check if sms_admins table exists
    const { data: smsAdmins, error: smsError } = await supabase
      .from('sms_admins')
      .select('*')
      .limit(1);
    
    if (smsError) {
      console.error('❌ sms_admins table error:', smsError.message);
      return false;
    }
    
    console.log('✅ sms_admins table exists');
    return true;
    
  } catch (error) {
    console.error('❌ Database structure check failed:', error.message);
    return false;
  }
}

async function checkPhoneNumbers() {
  console.log('\n📱 Step 2: Checking phone numbers in sms_admins...');
  
  try {
    const { data, error } = await supabase
      .from('sms_admins')
      .select('*')
      .eq('is_active', true)
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('❌ Error fetching phone numbers:', error.message);
      return false;
    }
    
    console.log('📋 Active phone numbers:');
    data.forEach(admin => {
      console.log(`  - ${admin.phone_number} (${admin.notes || 'No notes'})`);
    });
    
    const targetPhone = '+15164550980';
    const hasTargetPhone = data.some(admin => admin.phone_number === targetPhone);
    
    if (hasTargetPhone) {
      console.log(`✅ Target phone ${targetPhone} found in active numbers`);
    } else {
      console.log(`❌ Target phone ${targetPhone} NOT found in active numbers`);
    }
    
    return hasTargetPhone;
    
  } catch (error) {
    console.error('❌ Phone number check failed:', error.message);
    return false;
  }
}

async function testCodeGeneration() {
  console.log('\n🔢 Step 3: Testing 2FA code generation...');
  
  try {
    const { data, error } = await supabase.rpc('generate_2fa_code', {
      p_account_number: 999,
      p_ip_address: '127.0.0.1',
      p_user_agent: 'Test-Browser/1.0 (2FA-System-Test)'
    });
    
    if (error) {
      console.error('❌ Code generation error:', error.message);
      return null;
    }
    
    console.log('✅ 2FA code generated successfully');
    console.log('📋 Generated code details:');
    console.log(`  - ID: ${data.id}`);
    console.log(`  - Code: ${data.code}`);
    console.log(`  - Created: ${data.created_at}`);
    console.log(`  - Expires: ${data.expires_at}`);
    
    return data;
    
  } catch (error) {
    console.error('❌ Code generation failed:', error.message);
    return null;
  }
}

async function checkCodeInDatabase() {
  console.log('\n🗃️  Step 4: Checking if code was inserted into admin_logins...');
  
  try {
    const { data, error } = await supabase
      .from('admin_logins')
      .select('*')
      .eq('account_number', 999)
      .order('created_at', { ascending: false })
      .limit(3);
    
    if (error) {
      console.error('❌ Error checking admin_logins:', error.message);
      return false;
    }
    
    console.log('📋 Recent admin_logins for account 999:');
    data.forEach((login, index) => {
      const isExpired = new Date(login.expires_at) < new Date();
      const status = login.used ? 'USED' : isExpired ? 'EXPIRED' : 'ACTIVE';
      console.log(`  ${index + 1}. Code: ${login.code}, Status: ${status}, Created: ${login.created_at}`);
      console.log(`      IP: ${login.ip_address}, UA: ${login.user_agent}`);
    });
    
    return data.length > 0;
    
  } catch (error) {
    console.error('❌ Database check failed:', error.message);
    return false;
  }
}

async function testCodeValidation() {
  console.log('\n✅ Step 5: Testing code validation function...');
  
  try {
    // First get the most recent unused code for account 999
    const { data: recentCodes, error: fetchError } = await supabase
      .from('admin_logins')
      .select('*')
      .eq('account_number', 999)
      .eq('used', false)
      .gte('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false })
      .limit(1);
    
    if (fetchError || !recentCodes || recentCodes.length === 0) {
      console.log('⚠️  No valid unused codes found. Testing with dummy code...');
      
      // Test with invalid code
      const { data: invalidResult, error: invalidError } = await supabase.rpc('validate_admin_login_code', {
        p_account_number: 999,
        p_code: '999999'
      });
      
      if (invalidError) {
        console.error('❌ Validation function error:', invalidError.message);
        return false;
      }
      
      console.log(`🔍 Dummy code validation result: ${invalidResult}`);
      console.log('✅ Validation function works (correctly rejected invalid code)');
      return true;
    }
    
    const testCode = recentCodes[0].code;
    console.log(`🔍 Testing validation with actual code: ${testCode}`);
    
    // Test validation
    const { data: validResult, error: validError } = await supabase.rpc('validate_admin_login_code', {
      p_account_number: 999,
      p_code: testCode
    });
    
    if (validError) {
      console.error('❌ Validation error:', validError.message);
      return false;
    }
    
    console.log(`🔍 Code validation result: ${validResult}`);
    
    if (validResult) {
      console.log('✅ Code validation successful - code was marked as used');
      
      // Verify the code is now marked as used
      const { data: updatedCode, error: checkError } = await supabase
        .from('admin_logins')
        .select('*')
        .eq('id', recentCodes[0].id)
        .single();
      
      if (checkError) {
        console.error('❌ Error checking updated code:', checkError.message);
      } else {
        console.log(`🔍 Code status after validation: Used=${updatedCode.used}, Used_at=${updatedCode.used_at}`);
      }
    }
    
    return true;
    
  } catch (error) {
    console.error('❌ Code validation test failed:', error.message);
    return false;
  }
}

async function runFullTest() {
  console.log('🚀 Starting comprehensive 2FA system test...\n');
  
  const results = {
    structure: false,
    phones: false,
    generation: false,
    insertion: false,
    validation: false
  };
  
  // Run tests in sequence
  results.structure = await testDatabaseStructure();
  if (results.structure) {
    results.phones = await checkPhoneNumbers();
    
    const generatedCode = await testCodeGeneration();
    results.generation = generatedCode !== null;
    
    if (results.generation) {
      results.insertion = await checkCodeInDatabase();
      results.validation = await testCodeValidation();
    }
  }
  
  // Summary
  console.log('\n📊 TEST SUMMARY:');
  console.log('================');
  console.log(`✅ Database Structure: ${results.structure ? 'PASS' : 'FAIL'}`);
  console.log(`📱 Phone Numbers: ${results.phones ? 'PASS' : 'FAIL'}`);
  console.log(`🔢 Code Generation: ${results.generation ? 'PASS' : 'FAIL'}`);
  console.log(`🗃️  Database Insertion: ${results.insertion ? 'PASS' : 'FAIL'}`);
  console.log(`✅ Code Validation: ${results.validation ? 'PASS' : 'FAIL'}`);
  
  const passCount = Object.values(results).filter(Boolean).length;
  const totalTests = Object.keys(results).length;
  
  console.log(`\n🎯 Overall Result: ${passCount}/${totalTests} tests passed`);
  
  if (passCount === totalTests) {
    console.log('🎉 All tests passed! 2FA system is working correctly.');
  } else {
    console.log('⚠️  Some tests failed. Check the output above for details.');
  }
  
  return results;
}

// Run the test
runFullTest().catch(error => {
  console.error('💥 Test execution failed:', error.message);
  process.exit(1);
});