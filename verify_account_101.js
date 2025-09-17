// Quick verification script for account 101 authentication
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://ekklokrukxmqlahtonnc.supabase.co';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVra2xva3J1a3htcWxhaHRvbm5jIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MDA3MzE5NCwiZXhwIjoyMDU1NjQ5MTk0fQ.VzPGNEdJY6_VvEUTcdcyIUbmSFyJ-xoUOrSPcSlQPCU';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function verifyAccount101() {
  console.log('🔍 Verifying Account 101 Status...\n');

  try {
    // Check account 101 basic info
    const { data: account, error: accountError } = await supabase
      .from('accounts_lcmd')
      .select('account_number, acct_name, zip')
      .eq('account_number', 101)
      .single();

    if (accountError) {
      console.log('❌ Error getting account 101:', accountError.message);
      return;
    }

    console.log('📋 Account 101 Info:');
    console.log(`   Account Number: ${account.account_number}`);
    console.log(`   Account Name: ${account.acct_name}`);
    console.log(`   ZIP Code: ${account.zip}\n`);

    // Check if account 101 has custom password
    const { data: passwords, error: passwordError } = await supabase
      .from('user_passwords')
      .select('account_number')
      .eq('account_number', 101);

    if (passwordError) {
      console.log('❌ Error checking passwords:', passwordError.message);
      return;
    }

    const hasCustomPassword = passwords && passwords.length > 0;
    console.log(`🔐 Has Custom Password: ${hasCustomPassword ? 'YES' : 'NO'}\n`);

    // Test authentication function
    console.log('🧪 Testing Authentication Function...');
    const { data: authResult, error: authError } = await supabase.rpc('authenticate_user', {
      p_identifier: '101',
      p_password: '11803',
      p_ip_address: '127.0.0.1',
      p_2fa_code: null
    });

    if (authError) {
      console.log('❌ Authentication Error:', authError.message);
      return;
    }

    console.log('✅ Authentication Result:');
    if (authResult && authResult.length > 0) {
      const result = authResult[0];
      console.log(`   Account Number: ${result.account_number}`);
      console.log(`   Account Name: ${result.acct_name}`);
      console.log(`   ZIP Code: ${result.zip}`);
      console.log(`   Needs Password Init: ${result.needs_password_initialization}`);
      console.log(`   Authentication: SUCCESS! ✅`);
    } else {
      console.log('   Authentication: FAILED - No result returned ❌');
    }

  } catch (error) {
    console.log('❌ Unexpected error:', error.message);
  }
}

verifyAccount101();