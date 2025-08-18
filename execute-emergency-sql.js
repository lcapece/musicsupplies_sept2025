import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const SUPABASE_URL = 'https://ekklokrukxmqlahtonnc.supabase.co';
const SUPABASE_SERVICE_KEY = 'sbp_810a322ea6315b249e3972aab484906e30dbd24b';

// Create client with service key for admin access
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: {
    persistSession: false
  }
});

async function executeSQLBatch() {
  console.log('🚨 EMERGENCY SQL EXECUTION STARTING...\n');
  
  const sqlStatements = [
    // 1. Create app_events table
    {
      name: 'Create app_events table',
      sql: `CREATE TABLE IF NOT EXISTS app_events (
        id SERIAL PRIMARY KEY,
        event_type VARCHAR(100) NOT NULL,
        event_name VARCHAR(255) NOT NULL,
        event_data JSONB,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        created_by VARCHAR(100) DEFAULT CURRENT_USER,
        ip_address INET,
        user_agent TEXT,
        session_id VARCHAR(255),
        account_number VARCHAR(20),
        severity VARCHAR(20) DEFAULT 'INFO' CHECK (severity IN ('DEBUG', 'INFO', 'WARNING', 'ERROR', 'CRITICAL'))
      )`
    },
    
    // 2. Create indexes for app_events
    {
      name: 'Create app_events indexes',
      sql: `CREATE INDEX IF NOT EXISTS idx_app_events_event_type ON app_events(event_type);
            CREATE INDEX IF NOT EXISTS idx_app_events_created_at ON app_events(created_at);
            CREATE INDEX IF NOT EXISTS idx_app_events_account_number ON app_events(account_number);`
    },
    
    // 3. Create admin_settings table
    {
      name: 'Create admin_settings table',
      sql: `CREATE TABLE IF NOT EXISTS admin_settings (
        id SERIAL PRIMARY KEY,
        setting_key VARCHAR(50) UNIQUE NOT NULL,
        setting_value TEXT NOT NULL,
        description TEXT,
        last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_by VARCHAR(100)
      )`
    },
    
    // 4. Insert admin password
    {
      name: 'Set admin password',
      sql: `INSERT INTO admin_settings (setting_key, setting_value, description)
            VALUES ('admin_password', '2750grove', 'Administrative password for account 999')
            ON CONFLICT (setting_key) DO NOTHING`
    },
    
    // 5. Drop old functions
    {
      name: 'Drop deprecated functions',
      sql: `DROP FUNCTION IF EXISTS authenticate_user CASCADE;
            DROP FUNCTION IF EXISTS authenticate_user_v1 CASCADE;
            DROP FUNCTION IF EXISTS authenticate_user_v2 CASCADE;
            DROP FUNCTION IF EXISTS authenticate_user_v3 CASCADE;
            DROP FUNCTION IF EXISTS authenticate_user_v4 CASCADE;`
    },
    
    // 6. Create authenticate_user_v5
    {
      name: 'Create authenticate_user_v5 function',
      sql: fs.readFileSync('CREATE_AUTHENTICATE_USER_V5.sql', 'utf8').split('--')[0] // Get just the function
    }
  ];
  
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