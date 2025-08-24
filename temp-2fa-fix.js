// Temporary script to fix 2FA system for account 999
import { createClient } from '@supabase/supabase-js';

// Hardcode the values from .env for this temporary script
const supabaseUrl = 'https://ekklokrukxmqlahtonnc.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVra2xva3J1a3htcWxhaHRvbm5jIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDAwNzMxOTQsImV4cCI6MjA1NTY0OTE5NH0.LFyaAQyBb2l6rxdUAXpDQVZnR4gHDNrVZH0YudbjP3k';

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase configuration');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

console.log('Script starting...');

async function fix2FASystem() {
  try {
    console.log('🔧 Starting 2FA system fix for account 999...\n');

    // Step 1: Populate sms_admins table
    console.log('1. Populating sms_admins table...');
    const { data: insertData, error: insertError } = await supabase
      .from('sms_admins')
      .upsert([
        { phone_number: '+15164550980', is_active: true, notes: 'Primary admin' },
        { phone_number: '+15164107455', is_active: true, notes: 'Secondary admin' },
        { phone_number: '+15167650816', is_active: true, notes: 'Tertiary admin' }
      ], { 
        onConflict: 'phone_number',
        ignoreDuplicates: false 
      });

    if (insertError) {
      console.error('❌ Error inserting admin phone numbers:', insertError);
    } else {
      console.log('✅ Admin phone numbers inserted successfully');
    }

    // Step 2: Verify sms_admins table
    console.log('\n2. Verifying sms_admins table...');
    const { data: admins, error: adminError } = await supabase
      .from('sms_admins')
      .select('*')
      .eq('is_active', true);

    if (adminError) {
      console.error('❌ Error fetching admin data:', adminError);
    } else {
      console.log('✅ Active SMS admins:');
      console.table(admins);
    }

    // Step 3: Test 2FA code generation
    console.log('\n3. Testing 2FA code generation function...');
    const { data: codeData, error: codeError } = await supabase
      .rpc('generate_2fa_code', {
        p_account_number: 999,
        p_ip_address: '127.0.0.1',
        p_user_agent: 'test-browser'
      });

    if (codeError) {
      console.error('❌ Error generating 2FA code:', codeError);
    } else {
      console.log('✅ 2FA code generated successfully:');
      console.log(JSON.stringify(codeData, null, 2));
    }

    // Step 4: Check admin_logins table
    console.log('\n4. Checking admin_logins table...');
    const { data: logins, error: loginsError } = await supabase
      .from('admin_logins')
      .select('*')
      .eq('account_number', 999)
      .order('created_at', { ascending: false })
      .limit(3);

    if (loginsError) {
      console.error('❌ Error fetching login data:', loginsError);
    } else {
      console.log('✅ Recent admin login attempts for account 999:');
      console.table(logins);
    }

    console.log('\n🎉 2FA system fix completed!');

  } catch (error) {
    console.error('💥 Unexpected error:', error);
    process.exit(1);
  }
}

fix2FASystem();