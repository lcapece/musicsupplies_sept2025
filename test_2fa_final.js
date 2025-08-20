const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://ekklokrukxmqlahtonnc.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVra2xva3J1a3htcWxhaHRvbm5jIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDAwNzMxOTQsImV4cCI6MjA1NTY0OTE5NH0.LFyaAQyBb2l6rxdUAXpDQVZnR4gHDNrVZH0YudbjP3k';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

console.log('🧪 TESTING 2FA FOR ACCOUNT 999 🧪\n');

setTimeout(async () => {
  try {
    console.log('1️⃣  Testing login without 2FA code...');
    
    const { data, error } = await supabase.rpc('authenticate_user', {
      p_identifier: '999',
      p_password: '2750GroveAvenue',
      p_ip_address: '127.0.0.1',
      p_2fa_code: null
    });
    
    if (error) {
      console.log('❌ RPC Error:', error);
      process.exit(1);
    }
    
    console.log('📊 Response data:', JSON.stringify(data, null, 2));
    
    if (data && data.length > 0) {
      const user = data[0];
      console.log(`\n🔍 Account Number: ${user.account_number}`);
      console.log(`🔍 Account Name: ${user.acct_name}`);
      console.log(`🔍 Requires 2FA: ${user.requires_2fa}`);
      console.log(`🔍 Debug Info: ${user.debug_info}`);
      
      if (user.requires_2fa === true) {
        console.log('\n✅ SUCCESS! 2FA is properly required for account 999');
        
        // Check for generated codes
        console.log('\n2️⃣  Checking for generated 2FA codes...');
        const { data: codes, error: codesError } = await supabase
          .from('two_factor_codes')
          .select('*')
          .eq('account_number', 999)
          .eq('used', false)
          .order('created_at', { ascending: false })
          .limit(3);
          
        if (codesError) {
          console.log('❌ Codes error:', codesError);
        } else {
          console.log('📋 Generated codes:', codes);
          if (codes && codes.length > 0) {
            console.log(`🎯 Test Code: ${codes[0].code}`);
          }
        }
      } else {
        console.log('\n❌ FAILED! 2FA is NOT required for account 999');
        console.log('This means the backend function is not working correctly.');
      }
    } else {
      console.log('\n❌ FAILED! No user data returned');
    }
    
  } catch (e) {
    console.error('💥 Exception:', e);
  }
  
  process.exit(0);
}, 1000);