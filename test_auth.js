const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://ekklokrukxmqlahtonnc.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVra2xva3J1a3htcWxhaHRvbm5jIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDAwNzMxOTQsImV4cCI6MjA1NTY0OTE5NH0.LFyaAQyBb2l6rxdUAXpDQVZnR4gHDNrVZH0YudbjP3k';

const supabase = createClient(supabaseUrl, supabaseKey);

async function testAuth() {
    console.log('Testing authentication...\n');
    
    // Test Music123
    console.log('Testing 999/Music123:');
    const { data: music123Result, error: music123Error } = await supabase.rpc('authenticate_user_v5', {
        p_identifier: '999',
        p_password: 'Music123',
        p_ip_address: 'test'
    });
    
    if (music123Error) {
        console.log('Error:', music123Error.message);
    } else if (music123Result && music123Result.length > 0) {
        console.log('❌ DANGER: Music123 WORKS! Result:', music123Result);
    } else {
        console.log('✅ Good: Music123 blocked (empty result)');
    }
    
    // Test 2750grove
    console.log('\nTesting 999/2750grove:');
    const { data: groveResult, error: groveError } = await supabase.rpc('authenticate_user_v5', {
        p_identifier: '999',
        p_password: '2750grove',
        p_ip_address: 'test'
    });
    
    if (groveError) {
        console.log('Error:', groveError.message);
    } else if (groveResult && groveResult.length > 0) {
        console.log('✅ Good: 2750grove works! Result:', groveResult);
    } else {
        console.log('❌ Problem: 2750grove blocked');
    }
    
    // Check what functions exist
    console.log('\nChecking available functions:');
    const { data: functions, error: funcError } = await supabase.rpc('pg_get_functiondef', {
        funcoid: 'authenticate_user_v5'::regproc
    }).catch(e => ({ data: null, error: e }));
    
    if (functions) {
        console.log('Function definition:', functions);
    }
}

testAuth().catch(console.error);