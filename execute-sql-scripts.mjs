import { createClient } from '@supabase/supabase-js';
import { readFile } from 'fs/promises';
import path from 'path';

const SUPABASE_URL = 'https://ekklokrukxmqlahtonnc.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVra2xva3J1a3htcWxhaHRvbm5jIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MDA3MzE5NCwiZXhwIjoyMDU1NjQ5MTk0fQ.ZsVqBj8TaF5RbILv-JOlXWzQjNFI5yt5Yqn5cQMkgzw';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function executeSqlFile(filename) {
  console.log(`\n🔄 Executing ${filename}...`);
  
  try {
    const sqlContent = await readFile(filename, 'utf-8');
    console.log(`📄 Read ${sqlContent.length} characters from ${filename}`);
    
    // Execute the SQL using the rpc function for raw SQL
    const { data, error } = await supabase.rpc('exec_sql', {
      sql_query: sqlContent
    });
    
    if (error) {
      console.error(`❌ Error executing ${filename}:`, error);
      return false;
    }
    
    console.log(`✅ Successfully executed ${filename}`);
    if (data) {
      console.log(`📊 Result:`, data);
    }
    return true;
    
  } catch (err) {
    console.error(`❌ Failed to execute ${filename}:`, err.message);
    return false;
  }
}

async function main() {
  console.log('🚀 Starting SQL script execution...');
  console.log(`📡 Connecting to: ${SUPABASE_URL}`);
  
  // Test connection first
  try {
    const { data, error } = await supabase.from('accounts_lcmd').select('count').limit(1);
    if (error) {
      console.log('⚠️  Connection test (may be normal):', error.message);
    } else {
      console.log('✅ Connection test successful');
    }
  } catch (err) {
    console.error('❌ Connection test failed:', err.message);
    return;
  }
  
  // Execute SQL files in order
  const sqlFiles = [
    'EMERGENCY_AUTH_FIX_FINAL.sql',
    '2FA_SETUP.sql', 
    'ADD_2FA_PHONES.sql'
  ];
  
  for (const filename of sqlFiles) {
    const success = await executeSqlFile(filename);
    if (!success) {
      console.error(`⛔ Stopping execution due to error in ${filename}`);
      return;
    }
    
    // Small delay between executions
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  console.log('\n🎉 All SQL scripts executed successfully!');
  console.log('\n✅ Authentication system has been updated with:');
  console.log('   - Emergency auth fix applied');
  console.log('   - 2FA system setup for account 999'); 
  console.log('   - Phone numbers added for 2FA notifications');
}

main().catch(console.error);