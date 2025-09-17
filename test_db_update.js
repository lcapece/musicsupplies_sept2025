const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://ekklokrukxmqlahtonnc.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVra2xva3J1a3htcWxhaHRvbm5jIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDAwNzMxOTQsImV4cCI6MjA1NTY0OTE5NH0.LFyaAQyBb2l6rxdUAXpDQVZnR4gHDNrVZH0YudbjP3k';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

setTimeout(async () => {
  console.log('🔍 Testing database password update...');
  
  try {
    // Test get_admin_password function
    const { data, error } = await supabase.rpc('get_admin_password');
    
    console.log('📊 Function result:', {
      data: data,
      error: error,
      type: typeof data,
      expected: '2750GroveAvenue',
      matches: data === '2750GroveAvenue'
    });
    
    if (data === '2750GroveAvenue') {
      console.log('✅ SUCCESS! Password is now correct');
    } else {
      console.log('❌ FAILED! Password is still wrong:', data);
    }
    
  } catch (e) {
    console.error('💥 Error:', e);
  }
  
  process.exit(0);
}, 2000);

console.log('Testing in 2 seconds...');