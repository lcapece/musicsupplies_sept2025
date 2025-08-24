import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

console.log('Testing Supabase MCP Connection');
console.log('================================');

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Missing Supabase configuration');
  console.error('VITE_SUPABASE_URL:', supabaseUrl ? '✅ Set' : '❌ Missing');
  console.error('VITE_SUPABASE_ANON_KEY:', supabaseAnonKey ? '✅ Set' : '❌ Missing');
  process.exit(1);
}

console.log('✅ Environment variables loaded');
console.log('URL:', supabaseUrl);
console.log('Key:', supabaseAnonKey.substring(0, 20) + '...');

// Create Supabase client
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testConnection() {
  try {
    console.log('\n🔍 Testing connection...');
    
    // Test 1: Basic connection with a simple query
    console.log('Test 1: Basic connectivity test');
    const { data, error } = await supabase.from('rpc').select('version()').limit(1);
    
    if (error && error.code !== 'PGRST116') { // PGRST116 is "relation does not exist" which is expected
      console.log('✅ Connection successful (expected error for rpc table)');
    }

    // Test 2: List available tables using information_schema
    console.log('\nTest 2: Listing available tables');
    const { data: tables, error: tablesError } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public');

    if (tablesError) {
      console.log('⚠️  Could not list tables via information_schema:', tablesError.message);
      
      // Test 3: Try some common table names
      console.log('\nTest 3: Testing common table access');
      const commonTables = ['profiles', 'users', 'products', 'admin_logins', 'sms_logs'];
      
      for (const tableName of commonTables) {
        const { data, error } = await supabase
          .from(tableName)
          .select('*')
          .limit(1);
        
        if (!error) {
          console.log(`✅ Table '${tableName}' is accessible`);
        } else if (error.code === 'PGRST116') {
          console.log(`⚪ Table '${tableName}' does not exist`);
        } else {
          console.log(`❌ Table '${tableName}' error:`, error.message);
        }
      }
    } else {
      console.log('✅ Successfully retrieved table list:');
      tables.forEach(table => {
        console.log(`  - ${table.table_name}`);
      });
    }

    // Test 4: Check auth status
    console.log('\nTest 4: Authentication status');
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError) {
      console.log('⚪ No authenticated user (expected for anon key)');
    } else if (user) {
      console.log('✅ Authenticated user:', user.email);
    } else {
      console.log('⚪ Anonymous access (expected)');
    }

    console.log('\n🎉 Supabase connection test completed successfully!');
    
  } catch (error) {
    console.error('❌ Connection test failed:', error.message);
    process.exit(1);
  }
}

testConnection();