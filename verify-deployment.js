// Comprehensive test to verify function deployment status
const https = require('https');

// Test the generate endpoint
const testGenerate = () => {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify({ account_number: 999 });
    
    const options = {
      hostname: 'ekklokrukxmqlahtonnc.supabase.co',
      port: 443,
      path: '/functions/v1/admin-2fa-handler/generate',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      }
    };

    const req = https.request(options, (res) => {
      console.log(`Generate endpoint - Status Code: ${res.statusCode}`);
      console.log(`Generate endpoint - Headers:`, res.headers);
      
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        console.log('Generate endpoint - Response Body:', data);
        resolve({ status: res.statusCode, body: data });
      });
    });

    req.on('error', (error) => {
      console.error('Generate endpoint - Error:', error.message);
      reject(error);
    });

    req.write(postData);
    req.end();
  });
};

// Test a simple GET request to see if function exists at all
const testExists = () => {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'ekklokrukxmqlahtonnc.supabase.co',
      port: 443,
      path: '/functions/v1/admin-2fa-handler',
      method: 'GET'
    };

    const req = https.request(options, (res) => {
      console.log(`\nBase endpoint - Status Code: ${res.statusCode}`);
      
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        console.log('Base endpoint - Response Body:', data);
        resolve({ status: res.statusCode, body: data });
      });
    });

    req.on('error', (error) => {
      console.error('Base endpoint - Error:', error.message);
      reject(error);
    });

    req.end();
  });
};

// Run tests
console.log('Testing admin-2fa-handler function deployment...\n');

testGenerate()
  .then(() => testExists())
  .then(() => {
    console.log('\n=== DEPLOYMENT VERIFICATION COMPLETE ===');
  })
  .catch(error => {
    console.error('Test failed:', error);
  });