// Direct test of 2FA system with proper error handling
async function test2FA() {
  const SUPABASE_URL = 'https://ekklokrukxmqlahtonnc.supabase.co';
  const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVra2xva3J1a3htcWxhaHRvbm5jIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDAwNzMxOTQsImV4cCI6MjA1NTY0OTE5NH0.LFyaAQyBb2l6rxdUAXpDQVZnR4gHDNrVZH0YudbjP3k';
  
  console.log('🔍 Testing 2FA System for Account 999');
  console.log('=====================================');
  
  try {
    // Test 1: Check if edge function exists
    console.log('\n1. Testing edge function endpoint...');
    const response = await fetch(`${SUPABASE_URL}/functions/v1/admin-2fa-handler/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'X-Client-Info': 'test-script'
      },
      body: JSON.stringify({ account_number: 999 })
    });

    console.log('Response status:', response.status);
    console.log('Response headers:', Object.fromEntries(response.headers));
    
    let responseText;
    try {
      responseText = await response.text();
      console.log('Response body:', responseText);
    } catch (e) {
      console.log('Could not read response body:', e.message);
    }

    if (response.status === 404) {
      console.log('❌ Edge function not found or not deployed');
      return;
    }

    if (!response.ok) {
      console.log('❌ Edge function returned error');
      try {
        const errorData = JSON.parse(responseText);
        console.log('Error details:', errorData);
      } catch (e) {
        console.log('Could not parse error response as JSON');
      }
      return;
    }

    let result;
    try {
      result = JSON.parse(responseText);
      console.log('✅ Edge function response:', result);
    } catch (e) {
      console.log('❌ Could not parse successful response as JSON');
      return;
    }

    // Test 2: Try to verify with a dummy code
    console.log('\n2. Testing code verification...');
    const verifyResponse = await fetch(`${SUPABASE_URL}/functions/v1/admin-2fa-handler/verify`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
      },
      body: JSON.stringify({ account_number: 999, code: '123456' })
    });

    const verifyText = await verifyResponse.text();
    console.log('Verify response status:', verifyResponse.status);
    console.log('Verify response:', verifyText);

    console.log('\n✅ 2FA system test completed');

  } catch (error) {
    console.log('❌ Network or system error:', error.message);
    console.log('Error details:', error);
  }
}

// Run the test
test2FA().catch(console.error);