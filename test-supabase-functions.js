// Direct API testing script to validate Supabase functions
const https = require('https');

const SUPABASE_URL = 'https://ekklokrukxmqlahtonnc.supabase.co';

function makeRequest(url, options, data = null) {
    return new Promise((resolve, reject) => {
        const req = https.request(url, options, (res) => {
            let body = '';
            res.on('data', chunk => body += chunk);
            res.on('end', () => {
                resolve({
                    status: res.statusCode,
                    headers: res.headers,
                    body: body,
                    parsed: (() => {
                        try { return JSON.parse(body); } 
                        catch { return body; }
                    })()
                });
            });
        });
        
        req.on('error', reject);
        
        if (data) {
            req.write(typeof data === 'string' ? data : JSON.stringify(data));
        }
        
        req.end();
    });
}

async function testSupabaseFunctions() {
    console.log('Testing Supabase Edge Functions...\n');
    
    // Test admin-2fa-handler/generate
    console.log('1. Testing admin-2fa-handler/generate...');
    try {
        const result = await makeRequest(
            `${SUPABASE_URL}/functions/v1/admin-2fa-handler/generate`,
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                }
            },
            { account_number: 999 }
        );
        
        console.log(`   Status: ${result.status}`);
        console.log(`   Response: ${JSON.stringify(result.parsed, null, 2)}`);
    } catch (error) {
        console.log(`   ERROR: ${error.message}`);
    }
    
    console.log('\n2. Testing admin-2fa-handler/verify...');
    try {
        const result = await makeRequest(
            `${SUPABASE_URL}/functions/v1/admin-2fa-handler/verify`,
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                }
            },
            { account_number: 999, code: '123456' }
        );
        
        console.log(`   Status: ${result.status}`);
        console.log(`   Response: ${JSON.stringify(result.parsed, null, 2)}`);
    } catch (error) {
        console.log(`   ERROR: ${error.message}`);
    }
    
    console.log('\n3. Testing send-admin-2fa...');
    try {
        const result = await makeRequest(
            `${SUPABASE_URL}/functions/v1/send-admin-2fa`,
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                }
            },
            { code: '123456' }
        );
        
        console.log(`   Status: ${result.status}`);
        console.log(`   Response: ${JSON.stringify(result.parsed, null, 2)}`);
    } catch (error) {
        console.log(`   ERROR: ${error.message}`);
    }
    
    console.log('\n4. Testing send-admin-sms...');
    try {
        const result = await makeRequest(
            `${SUPABASE_URL}/functions/v1/send-admin-sms`,
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                }
            },
            { 
                eventName: 'TEST', 
                message: 'Test message from console script' 
            }
        );
        
        console.log(`   Status: ${result.status}`);
        console.log(`   Response: ${JSON.stringify(result.parsed, null, 2)}`);
    } catch (error) {
        console.log(`   ERROR: ${error.message}`);
    }
}

testSupabaseFunctions().catch(console.error);