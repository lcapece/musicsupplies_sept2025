import https from 'https';

const SUPABASE_URL = 'https://ekklokrukxmqlahtonnc.supabase.co';
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVra2xva3J1a3htcWxhaHRvbm5jIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MDA3MzE5NCwiZXhwIjoyMDU1NjQ5MTk0fQ.VzPGNEdJY6_VvEUTcdcyIUbmSFyJ-xoUOrSPcSlQPCU';

async function makeRequest(endpoint, method = 'GET', body = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(`${SUPABASE_URL}${endpoint}`);
    
    const options = {
      hostname: url.hostname,
      port: 443,
      path: url.pathname + url.search,
      method: method,
      headers: {
        'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
        'apikey': SERVICE_ROLE_KEY,
        'Content-Type': 'application/json'
      }
    };
    
    if (body) {
      const bodyStr = JSON.stringify(body);
      options.headers['Content-Length'] = Buffer.byteLength(bodyStr);
    }
    
    const req = https.request(options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        try {
          const result = data ? JSON.parse(data) : null;
          console.log(`Status: ${res.statusCode}, Response:`, result || data);
          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve(result);
          } else {
            reject(new Error(`HTTP ${res.statusCode}: ${data}`));
          }
        } catch (error) {
          console.log('Raw response:', data);
          resolve({ raw: data, status: res.statusCode });
        }
      });
    });
    
    req.on('error', (error) => {
      reject(error);
    });
    
    if (body) {
      req.write(JSON.stringify(body));
    }
    
    req.end();
  });
}

async function testFunction() {
  console.log('🔍 Testing if store_2fa_code function exists...');
  
  try {
    // Test calling the function
    const result = await makeRequest('/rest/v1/rpc/store_2fa_code', 'POST', {
      p_account_number: 999,
      p_code: '123456',
      p_ip_address: '127.0.0.1'
    });
    
    console.log('✅ Function exists and responded successfully!');
    console.log('📊 Response:', result);
    
  } catch (err) {
    if (err.message.includes('404')) {
      console.log('❌ Function does not exist yet');
    } else {
      console.log('⚠️ Function might exist but returned error:', err.message);
    }
  }
}

testFunction().catch(console.error);