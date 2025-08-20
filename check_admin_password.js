const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://ekklokrukxmqlahtonnc.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVra2xva3J1a3htcWxhaHRvbm5jIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDAwNzMxOTQsImV4cCI6MjA1NTY0OTE5NH0.LFyaAQyBb2l6rxdUAXpDQVZnR4gHDNrVZH0YudbjP3k';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

console.log('🔍 Checking admin password configuration...\n');

setTimeout(async () => {
  try {
    // Check what's actually in admin_config
    console.log('1️⃣  Checking admin_config table...');
    const { data: configData, error: configError } = await supabase
      .from('admin_config')
      .select('*')
      .eq('config_key', 'admin_999_password');
    
    if (configError) {
      console.log('❌ Config error:', configError);
    } else {
      console.log('📊 Admin config data:', configData);
    }
    
    // Test get_admin_password function
    console.log('\n2️⃣  Testing get_admin_password function...');
    const { data: funcData, error: funcError } = await supabase.rpc('get_admin_password');
    
    if (funcError) {
      console.log('❌ Function error:', funcError);
    } else {
      console.log('📊 Function returned:', funcData);
      console.log('📊 Type:', typeof funcData);
      console.log('📊 Length:', funcData?.length);
    }
    
    // Test direct authenticate_user call with debug
    console.log('\n3️⃣  Testing authenticate_user with different passwords...');
    
    const testPasswords = ['2750GroveAvenue', '2750grove', '2750Grove'];
    
    for (const testPass of testPasswords) {
      console.log(`\n🧪 Testing password: "${testPass}"`);
      const { data: authData, error: authError } = await supabase.rpc('authenticate_user', {
        p_identifier: '999',
        p_password: testPass,
        p_ip_address: '127.0.0.1',
        p_2fa_code: null
      });
      
      if (authError) {
        console.log(`❌ Auth error:`, authError);
      } else {
        console.log(`📊 Auth result (length: ${authData?.length}):`, authData);
        if (authData && authData.length > 0) {
          console.log(`✅ SUCCESS with password: "${testPass}"`);
          console.log(`🔍 Debug info: ${authData[0].debug_info}`);
          console.log(`🔍 Requires 2FA: ${authData[0].requires_2fa}`);
        }
      }
    }
    
  } catch (e) {
    console.error('💥 Exception:', e);
  }
  
  process.exit(0);
}, 1000);