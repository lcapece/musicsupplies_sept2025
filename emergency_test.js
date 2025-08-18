const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://ekklokrukxmqlahtonnc.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVra2xva3J1a3htcWxhaHRvbm5jIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDAwNzMxOTQsImV4cCI6MjA1NTY0OTE5NH0.LFyaAQyBb2l6rxdUAXpDQVZnR4gHDNrVZH0YudbjP3k';

const supabase = createClient(supabaseUrl, supabaseKey);

async function emergencyTest() {
    console.log('=== EMERGENCY TEST - WHY DOES MUSIC123 WORK? ===\n');
    
    // Test authenticate_user_v5
    console.log('Testing authenticate_user_v5 with Music123:');
    const { data: v5, error: e5 } = await supabase.rpc('authenticate_user_v5', {
        p_identifier: '999',
        p_password: 'Music123',
        p_ip_address: 'EMERGENCY'
    });
    
    if (v5 && v5.length > 0) {
        console.log('❌❌❌ authenticate_user_v5 ALLOWS Music123!');
        console.log('Result:', v5);
    } else {
        console.log('✅ authenticate_user_v5 blocks Music123');
    }
    
    // Test authenticate_user_v6
    console.log('\nTesting authenticate_user_v6 with Music123:');
    const { data: v6, error: e6 } = await supabase.rpc('authenticate_user_v6', {
        p_identifier: '999',
        p_password: 'Music123',
        p_ip_address: 'EMERGENCY'
    });
    
    if (v6 && v6.length > 0) {
        console.log('❌❌❌ authenticate_user_v6 ALLOWS Music123!');
        console.log('Result:', v6);
    } else {
        console.log('✅ authenticate_user_v6 blocks Music123');
    }
    
    // Check if there are OTHER authentication functions
    console.log('\nChecking for other authentication functions...');
    const { data: funcs } = await supabase.rpc('query_pg_proc', {
        pattern: 'authenticate%'
    }).catch(() => ({ data: null }));
    
    if (funcs) {
        console.log('Functions found:', funcs);
    }
    
    // Check app_events for recent logins
    console.log('\nChecking recent login events...');
    const { data: events } = await supabase
        .from('app_events')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(5);
    
    if (events) {
        events.forEach(e => {
            console.log(`- ${e.event_type}: ${e.event_name} at ${e.created_at}`);
            if (e.event_data) {
                console.log('  Data:', JSON.stringify(e.event_data));
            }
        });
    }
}

emergencyTest().catch(console.error);