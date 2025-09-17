const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://ekklokrukxmqlahtonnc.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVra2xva3J1a3htcWxhaHRvbm5jIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDAwNzMxOTQsImV4cCI6MjA1NTY0OTE5NH0.LFyaAQyBb2l6rxdUAXpDQVZnR4gHDNrVZH0YudbjP3k';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function testConnection() {
    console.log('Testing Supabase connection...');
    
    try {
        // Test basic connection
        const { data, error } = await supabase.from('accounts_lcmd').select('account_number').eq('account_number', 999).limit(1);
        
        if (error) {
            console.error('Connection error:', error);
        } else {
            console.log('Connection successful. Found account 999:', data);
        }
    } catch (e) {
        console.error('Exception:', e);
    }
}

testConnection();