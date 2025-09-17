// Final deployment test using fetch (if available) or manual HTTP request
const testEndpoints = async () => {
  const baseUrl = 'https://ekklokrukxmqlahtonnc.supabase.co';
  
  console.log('=== TESTING ADMIN-2FA-HANDLER DEPLOYMENT ===\n');
  
  // Test 1: Generate endpoint with POST
  try {
    console.log('Test 1: POST to /functions/v1/admin-2fa-handler/generate');
    const response = await fetch(`${baseUrl}/functions/v1/admin-2fa-handler/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ account_number: 999 })
    });
    
    console.log(`Status: ${response.status} ${response.statusText}`);
    const text = await response.text();
    console.log(`Response: ${text}`);
    
    if (response.status === 200) {
      console.log('✅ Function is deployed and working!');
    } else if (response.status === 404) {
      console.log('❌ Function not found - deployment may have failed');
    } else {
      console.log('⚠️  Function exists but returned unexpected status');
    }
  } catch (error) {
    console.log(`❌ Network error: ${error.message}`);
  }
  
  console.log('\n' + '='.repeat(50));
};

// For Node.js environments that don't have fetch
if (typeof fetch === 'undefined') {
  global.fetch = require('node-fetch');
}

testEndpoints().catch(console.error);