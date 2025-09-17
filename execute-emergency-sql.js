import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const SUPABASE_URL = 'https://ekklokrukxmqlahtonnc.supabase.co';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVra2xva3J1a3htcWxhaHRvbm5jIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MDA3MzE5NCwiZXhwIjoyMDU1NjQ5MTk0fQ.ZsVqBj8TaF5RbILv-JOlXWzQjNFI5yt5Yqn5cQMkgzw';

// Create client with service key for admin access
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: {
    persistSession: false
  }
});

async function executeSQLBatch() {
  console.log('🚀 EXECUTING REQUESTED SQL FILES...\n');
  
  const sqlFiles = [
    {
      name: 'EMERGENCY_AUTH_FIX_FINAL.sql',
      description: 'Emergency authentication system fix'
    },
    {
      name: '2FA_SETUP.sql',
      description: '2FA system setup for account 999'
    },
    {
      name: 'ADD_2FA_PHONES.sql', 
      description: 'Add phone numbers for 2FA'
    }
  ];

  const sqlStatements = sqlFiles.map(file => ({
    name: file.description,
    sql: fs.readFileSync(file.name, 'utf8')
  }));
  
  let successCount = 0;
  let failCount = 0;
  
  for (const statement of sqlStatements) {
    try {
      console.log(`✅ Executing: ${statement.name}`);
      const { data, error } = await supabase.rpc('query', { 
        query: statement.sql 
      });
      
      if (error) {
        // Try direct execution as fallback
        const result = await fetch(`${SUPABASE_URL}/rest/v1/rpc/query`, {
          method: 'POST',
          headers: {
            'apikey': SUPABASE_SERVICE_KEY,
            'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ query: statement.sql })
        });
        
        if (!result.ok) {
          throw new Error(`HTTP ${result.status}: ${await result.text()}`);
        }
      }
      
      console.log(`   ✓ ${statement.name} completed successfully\n`);
      successCount++;
    } catch (error) {
      console.error(`   ✗ ${statement.name} failed:`, error.message, '\n');
      failCount++;
    }
  }
  
  console.log('\n' + '='.repeat(50));
  console.log(`EXECUTION COMPLETE: ${successCount} succeeded, ${failCount} failed`);
  console.log('='.repeat(50));
  
  if (failCount === 0) {
    console.log('🎉 ALL EMERGENCY UPDATES APPLIED SUCCESSFULLY!');
  } else {
    console.log('⚠️  Some updates failed. Manual intervention may be required.');
  }
}

// Run the emergency update
executeSQLBatch().catch(console.error);