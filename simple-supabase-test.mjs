import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://ekklokrukxmqlahtonnc.supabase.co';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVra2xva3J1a3htcWxhaHRvbm5jIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MDA3MzE5NCwiZXhwIjoyMDU1NjQ5MTk0fQ.VzPGNEdJY6_VvEUTcdcyIUbmSFyJ-xoUOrSPcSlQPCU';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// Execute the exact SQL you requested
async function runYourSQL() {
  try {
    // First, try to run using exec_sql function
    console.log('Running: CREATE TABLE PUBLIC.DUMMY2(x INT);');
    const createResult = await supabase.rpc('exec_sql', { 
      sql_query: 'CREATE TABLE PUBLIC.DUMMY2(x INT);' 
    });
    
    console.log('Create result:', createResult);
    
    console.log('Running: INSERT INTO DUMMY2 VALUES(39);');
    const insertResult = await supabase.rpc('exec_sql', { 
      sql_query: 'INSERT INTO DUMMY2 VALUES(39);' 
    });
    
    console.log('Insert result:', insertResult);
    
    // Verify the data
    console.log('Verifying data...');
    const verifyResult = await supabase
      .from('dummy2')
      .select('*');
    
    console.log('Verify result:', verifyResult);
    
  } catch (error) {
    console.log('Error:', error.message);
  }
}

runYourSQL();