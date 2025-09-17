import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://ekklokrukxmqlahtonnc.supabase.co';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVra2xva3J1a3htcWxhaHRvbm5jIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MDA3MzE5NCwiZXhwIjoyMDU1NjQ5MTk0fQ.VzPGNEdJY6_VvEUTcdcyIUbmSFyJ-xoUOrSPcSlQPCU';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function runSQL() {
  try {
    console.log('🔄 Creating table DUMMY2...');
    
    // Try using the exec_sql function
    const { data: createResult, error: createError } = await supabase.rpc('exec_sql', { 
      sql_query: 'CREATE TABLE PUBLIC.DUMMY2(x INT);' 
    });
    
    if (createError) {
      console.log('❌ Create table error:', createError.message);
      // Try alternative method if exec_sql doesn't exist
      console.log('🔄 Trying direct table creation...');
    } else {
      console.log('✅ Table created successfully');
    }
    
    console.log('🔄 Inserting data...');
    const { data: insertData, error: insertError } = await supabase
      .from('dummy2')
      .insert([{ x: 39 }])
      .select();
    
    if (insertError) {
      console.log('❌ Insert error:', insertError.message);
      
      // Try using exec_sql for insert
      const { data: insertResult2, error: insertError2 } = await supabase.rpc('exec_sql', { 
        sql_query: 'INSERT INTO DUMMY2 VALUES(39);' 
      });
      
      if (insertError2) {
        console.log('❌ SQL Insert error:', insertError2.message);
      } else {
        console.log('✅ Data inserted via SQL');
      }
    } else {
      console.log('✅ Data inserted successfully:', insertData);
    }
    
    // Verify the data
    console.log('🔄 Verifying data...');
    const { data: verifyData, error: verifyError } = await supabase
      .from('dummy2')
      .select('*');
      
    if (verifyError) {
      console.log('❌ Verify error:', verifyError.message);
    } else {
      console.log('✅ Data verified:', verifyData);
    }
    
  } catch (error) {
    console.error('❌ Unexpected error:', error.message);
  }
}

runSQL();