// Quick test of 2FA system to send SMS to +15164550980
const SUPABASE_URL = 'https://ekklokrukxmqlahtonnc.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVra2xva3J1a3htcWxhaHRvbm5jIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDAwNzMxOTQsImV4cCI6MjA1NTY0OTE5NH0.LFyaAQyBb2l6rxdUAXpDQVZnR4gHDNrVZH0YudbjP3k';

async function testNow() {
    console.log('🔍 Testing 2FA - Should send SMS to +15164550980');
    
    try {
        const response = await fetch(`${SUPABASE_URL}/functions/v1/admin-2fa-handler/generate`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
            },
            body: JSON.stringify({ account_number: 999 })
        });

        console.log('Status:', response.status);
        
        if (response.status === 404) {
            console.log('❌ Function not deployed');
            return;
        }
        
        const text = await response.text();
        console.log('Response:', text);
        
        if (response.ok) {
            console.log('✅ Request sent - CHECK YOUR PHONE +15164550980 for SMS!');
        } else {
            console.log('❌ Error occurred');
        }
        
    } catch (error) {
        console.log('❌ Network error:', error.message);
    }
}

testNow();