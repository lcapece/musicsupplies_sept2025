const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://ekklokrukxmqlahtonnc.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVra2xva3J1a3htcWxhaHRvbm5jIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDAwNzMxOTQsImV4cCI6MjA1NTY0OTE5NH0.LFyaAQyBb2l6rxdUAXpDQVZnR4gHDNrVZH0YudbjP3k';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function runEmergencySQL() {
  console.log('🚨 EXECUTING EMERGENCY SQL UPDATES...\n');
  
  try {
    // Test basic connection
    const { data: test, error: testError } = await supabase
      .from('accounts_lcmd')
      .select('count')
      .limit(1);
    
    if (testError) {
      console.log('Connection test failed:', testError);
    } else {
      console.log('✅ Connection established\n');
    }
    
    // Try to check if app_events exists
    const { data: tables, error: tablesError } = await supabase
      .from('app_events')
      .select('id')
      .limit(1);
    
    if (tablesError && tablesError.message.includes('does not exist')) {
      console.log('❌ app_events table does not exist - needs to be created');
    } else if (!tablesError) {
      console.log('✅ app_events table already exists');
    }
    
    // Check admin_settings
    const { data: settings, error: settingsError } = await supabase
      .from('admin_settings')
      .select('*')
      .eq('setting_key', 'admin_password')
      .single();
    
    if (settingsError && settingsError.message.includes('does not exist')) {
      console.log('❌ admin_settings table does not exist - needs to be created');
    } else if (settings) {
      console.log('✅ admin_settings exists with password:', settings.setting_value);
    }
    
    // Test authenticate_user_v5
    const { data: authTest, error: authError } = await supabase
      .rpc('authenticate_user_v5', {
        p_account_number: '999',
        p_password: '2750grove'
      });
    
    if (authError) {
      console.log('❌ authenticate_user_v5 function error:', authError.message);
    } else {
      console.log('✅ authenticate_user_v5 function exists');
    }
    
    console.log('\n' + '='.repeat(60));
    console.log('⚠️  CRITICAL: SQL must be run directly in Supabase Dashboard');
    console.log('='.repeat(60));
    console.log('\n📋 INSTRUCTIONS:');
    console.log('1. Go to: https://supabase.com/dashboard/project/ekklokrukxmqlahtonnc/sql');
    console.log('2. Open the file: MASTER_SQL_EMERGENCY.sql');
    console.log('3. Copy ALL contents and paste into SQL Editor');
    console.log('4. Click "Run" to execute all statements');
    console.log('\n⚡ This will:');
    console.log('   - Create app_events audit table');
    console.log('   - Create admin_settings table');
    console.log('   - Set admin password to 2750grove');
    console.log('   - Create authenticate_user_v5 function');
    console.log('   - Clean up all deprecated functions');
    console.log('   - Add security constraints');
    
  } catch (error) {
    console.error('Error:', error);
  }
}

runEmergencySQL();