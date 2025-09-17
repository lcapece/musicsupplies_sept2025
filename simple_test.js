console.log('Testing Music123...');

const fetch = require('node-fetch');

async function test() {
    const url = 'https://ekklokrukxmqlahtonnc.supabase.co/rest/v1/rpc/authenticate_user_v5';
    const key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVra2xva3J1a3htcWxhaHRvbm5jIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDAwNzMxOTQsImV4cCI6MjA1NTY0OTE5NH0.LFyaAQyBb2l6rxdUAXpDQVZnR4gHDNrVZH0YudbjP3k';
    
    const response = await fetch(url, {
        method: 'POST',
        headers: {
            'apikey': key,
            'Authorization': `Bearer ${key}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            p_identifier: '999',
            p_password: 'Music123',
            p_ip_address: 'test'
        })
    });
    
    const data = await response.json();
    
    if (data && data.length > 0) {
        console.log('❌❌❌ CRITICAL: Music123 STILL WORKS!');
        console.log('Response:', data);
    } else {
        console.log('✅ Music123 is blocked');
    }
}

test().catch(e => console.error('Error:', e.message));