import { readFile } from 'fs/promises';
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
          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve(result);
          } else {
            reject(new Error(`HTTP ${res.statusCode}: ${data}`));
          }
        } catch (error) {
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

async function executeSql() {
  console.log('🔄 Executing STORE_2FA_CODE.sql...');
  
  try {
    const sqlContent = await readFile('STORE_2FA_CODE.sql', 'utf-8');
    console.log(`📄 Read ${sqlContent.length} characters from STORE_2FA_CODE.sql`);
    
    const result = await makeRequest('/rest/v1/rpc/exec_sql', 'POST', {
      sql_query: sqlContent
    });
    
    console.log('✅ Successfully executed STORE_2FA_CODE.sql');
    if (result && result !== null) {
      console.log('📊 Result:', result);
    }
    console.log('🎉 2FA code storage function has been created successfully!');
    console.log('');
    console.log('The function store_2fa_code(account_number, code, ip_address) is now available.');
    console.log('It will:');
    console.log('- Only allow 2FA for account 999');
    console.log('- Set expiration to 90 seconds from creation');
    console.log('- Store the code in the two_factor_codes table');
    console.log('- Return JSON with success status and expiration time');
    
  } catch (err) {
    console.error('❌ Failed to execute STORE_2FA_CODE.sql:', err.message);
    process.exit(1);
  }
}

executeSql().catch(console.error);