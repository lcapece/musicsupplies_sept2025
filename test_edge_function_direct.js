// Test the admin-2fa-handler Edge function directly
import fetch from 'node-fetch';

const SUPABASE_URL = 'https://ekklokrukxmqlahtonnc.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVra2xva3J1a3htcWxhaHRvbm5jIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDAwNzMxOTQsImV4cCI6MjA1NTY0OTE5NH0.LFyaAQyBb2l6rxdUAXpDQVZnR4gHDNrVZH0YudbjP3k';

async function testEdgeFunction() {
    console.log('Testing admin-2fa-handler Edge function...');
    
    try {
        const url = `${SUPABASE_URL}/functions/v1/admin-2fa-handler/generate`;
        console.log('Calling URL:', url);
        
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
            },
            body: JSON.stringify({ account_number: 999 })
        });

        console.log('Response status:', response.status);
        console.log('Response headers:', Object.fromEntries(response.headers.entries()));
        
        const result = await response.text();
        console.log('Response body:', result);
        
        if (response.ok) {
            console.log('✅ SUCCESS: Function is working!');
            const json = JSON.parse(result);
            console.log('SMS sent to', json.sent_to, 'recipients');
        } else {
            console.log('❌ ERROR: Function failed');
            console.log('Status:', response.status);
            console.log('Body:', result);
        }
        
    } catch (error) {
        console.error('❌ NETWORK ERROR:', error.message);
    }
}

await testEdgeFunction();