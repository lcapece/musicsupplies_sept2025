const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://ekklokrukxmqlahtonnc.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVra2xva3J1a3htcWxhaHRvbm5jIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDAwNzMxOTQsImV4cCI6MjA1NTY0OTE5NH0.LFyaAQyBb2l6rxdUAXpDQVZnR4gHDNrVZH0YudbjP3k';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function checkFunctions() {
    console.log('Checking available functions...');
    
    try {
        // Test if authenticate_user function exists by calling it
        console.log('Testing authenticate_user function...');
        const { data, error } = await supabase.rpc('authenticate_user', {
            p_identifier: '999',
            p_password: '2750GroveAvenue',
            p_ip_address: '127.0.0.1',
            p_2fa_code: null
        });
        
        console.log('Response data:', JSON.stringify(data, null, 2));
        console.log('Response error:', error);
        
        if (data && data.length > 0) {
            console.log('Function response keys:', Object.keys(data[0]));
            console.log('requires_2fa value:', data[0].requires_2fa);
            console.log('account_number:', data[0].account_number);
        }
        
    } catch (e) {
        console.error('Exception:', e);
    }
}

checkFunctions().then(() => process.exit(0));