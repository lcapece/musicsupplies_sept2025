import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://ekklokrukxmqlahtonnc.supabase.co';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVra2xva3J1a3htcWxhaHRvbm5jIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MDA3MzE5NCwiZXhwIjoyMDU1NjQ5MTk0fQ.VzPGNEdJY6_VvEUTcdcyIUbmSFyJ-xoUOrSPcSlQPCU';

console.log('🔄 Testing Supabase MCP connection...');
console.log('URL:', SUPABASE_URL);
console.log('Service key (first 20 chars):', SUPABASE_SERVICE_KEY.substring(0, 20) + '...');

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function testConnection() {
  try {
    console.log('\n1. Testing basic connection...');
    
    // Test a simple query first
    const { data: tables, error: tablesError } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public')
      .limit(5);
      
    if (tablesError) {
      console.log('⚠️  Information schema not accessible:', tablesError.message);
      console.log('Trying alternative test...');
      
      // Try testing with a known table
      const { data: testData, error: testError } = await supabase
        .from('accounts_lcmd')
        .select('account')
        .limit(1);
        
      if (testError) {
        console.log('❌ Connection test failed:', testError.message);
        return false;
      } else {
        console.log('✅ Connection successful via accounts_lcmd test');
      }
    } else {
      console.log('✅ Connection successful! Found tables:', tables);
    }
    
    console.log('\n2. Testing CREATE TABLE command...');
    
    // Try to create the table
    const { data: createResult, error: createError } = await supabase.rpc('exec_sql', { 
      sql_query: 'CREATE TABLE IF NOT EXISTS PUBLIC.DUMMY2(x INT);' 
    });
    
    if (createError) {
      console.log('❌ CREATE TABLE failed:', createError.message);
      console.log('Error details:', createError);
    } else {
      console.log('✅ CREATE TABLE successful');
    }
    
    console.log('\n3. Testing INSERT command...');
    
    // Try to insert data
    const { data: insertData, error: insertError } = await supabase
      .from('dummy2')
      .insert([{ x: 39 }])
      .select();
    
    if (insertError) {
      console.log('❌ INSERT failed:', insertError.message);
      console.log('Trying SQL INSERT...');
      
      const { data: insertResult, error: insertError2 } = await supabase.rpc('exec_sql', { 
        sql_query: 'INSERT INTO DUMMY2 VALUES(39);' 
      });
      
      if (insertError2) {
        console.log('❌ SQL INSERT failed:', insertError2.message);
      } else {
        console.log('✅ SQL INSERT successful');
      }
    } else {
      console.log('✅ INSERT successful:', insertData);
    }
    
    console.log('\n4. Verifying data...');
    
    const { data: verifyData, error: verifyError } = await supabase
      .from('dummy2')
      .select('*');
      
    if (verifyError) {
      console.log('❌ Data verification failed:', verifyError.message);
    } else {
      console.log('✅ Data verification successful:', verifyData);
    }
    
    return true;
    
  } catch (error) {
    console.error('❌ Unexpected error:', error);
    return false;
  }
}

testConnection()
  .then(success => {
    if (success) {
      console.log('\n🎉 Supabase MCP is working correctly!');
    } else {
      console.log('\n💥 Supabase MCP has issues that need fixing');
    }
  })
  .catch(err => {
    console.error('💥 Fatal error:', err);
  });