require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

// Read Supabase URL and anon key from environment
const SUPABASE_URL = 'https://ekklokrukxmqlahtonnc.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVra2xva3J1a3htcWxhaHRvbm5jIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDAwNzMxOTQsImV4cCI6MjA1NTY0OTE5NH0.LFyaAQyBb2l6rxdUAXpDQVZnR4gHDNrVZH0YudbjP3k';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function setup2FASystem() {
  console.log('Starting 2FA system setup for account 999...');
  console.log('Supabase URL:', SUPABASE_URL);
  console.log('Supabase Key (first 20 chars):', SUPABASE_ANON_KEY.substring(0, 20) + '...');
  console.log();
  
  try {
    // 1. Insert SMS admins with conflict handling
    console.log('1. Populating sms_admins table...');
    
    // First, check if sms_admins table exists
    const { data: tableExists, error: tableError } = await supabase
      .from('sms_admins')
      .select('phone_number')
      .limit(1);
      
    if (tableError && tableError.code === '42P01') {
      console.log('❌ sms_admins table does not exist. Please run the migration first.');
      return;
    }
    
    // Insert each admin individually to handle conflicts better
    const admins = [
      { phone: '+15164550980', notes: 'Primary admin' },
      { phone: '+15164107455', notes: 'Secondary admin' },
      { phone: '+15167650816', notes: 'Tertiary admin' }
    ];
    
    for (const admin of admins) {
      const { data, error } = await supabase
        .from('sms_admins')
        .upsert({ 
          phone_number: admin.phone, 
          is_active: true, 
          notes: admin.notes 
        }, { 
          onConflict: 'phone_number',
          ignoreDuplicates: false 
        });
        
      if (error) {
        console.error(`Error upserting ${admin.phone}:`, error);
      } else {
        console.log(`✓ Added/updated ${admin.phone}: ${admin.notes}`);
      }
    }
    
    // 2. Verify the table is populated
    console.log('\n2. Verifying sms_admins table...');
    const { data: selectData, error: selectError } = await supabase
      .from('sms_admins')
      .select('phone_number, is_active, notes')
      .eq('is_active', true);
    
    if (selectError) {
      console.error('Error selecting SMS admins:', selectError);
    } else {
      console.log('✓ Active SMS admins found:');
      selectData.forEach(admin => {
        console.log(`  - ${admin.phone_number}: ${admin.notes}`);
      });
    }
    
    // 3. Clean up expired 2FA codes
    console.log('\n3. Cleaning up expired 2FA codes for account 999...');
    const { data: deleteData, error: deleteError } = await supabase
      .from('admin_logins')
      .delete()
      .eq('account_number', 999)
      .lt('expires_at', new Date().toISOString());
    
    if (deleteError) {
      console.error('Error cleaning up expired codes:', deleteError);
    } else {
      console.log('✓ Expired 2FA codes cleaned up');
    }
    
    console.log('\n✅ 2FA system setup completed successfully!');
    
  } catch (error) {
    console.error('❌ Setup failed:', error);
  }
}

// Run the setup
console.log('Script starting...');
setup2FASystem()
  .then(() => console.log('Script completed.'))
  .catch((error) => {
    console.error('Script error:', error);
    process.exit(1);
  });