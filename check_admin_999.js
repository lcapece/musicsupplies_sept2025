console.log('🔍 Checking admin configuration for user 999...');

async function checkAdmin999() {
    const url = 'https://ekklokrukxmqlahtonnc.supabase.co/rest/v1/rpc/get_admin_password';
    const key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVra2xva3J1a3htcWxhaHRvbm5jIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDAwNzMxOTQsImV4cCI6MjA1NTY0OTE5NH0.LFyaAQyBb2l6rxdUAXpDQVZnR4gHDNrVZH0YudbjP3k';
    
    try {
        console.log('\n1. Testing get_admin_password function...');
        const response1 = await fetch(url, {
            method: 'POST',
            headers: {
                'apikey': key,
                'Authorization': `Bearer ${key}`,
                'Content-Type': 'application/json'
            }
        });
        
        const data1 = await response1.json();
        console.log('Response status:', response1.status);
        console.log('Admin password result:', data1);
        
        if (data1 && typeof data1 === 'string' && data1.length > 0) {
            console.log('✅ Admin password is set:', {
                length: data1.length,
                first_chars: data1.substring(0, 3) + '***'
            });
            
            // Test the password validation
            console.log('\n2. Testing validate_admin_password function...');
            const validateUrl = 'https://ekklokrukxmqlahtonnc.supabase.co/rest/v1/rpc/validate_admin_password';
            const response2 = await fetch(validateUrl, {
                method: 'POST',
                headers: {
                    'apikey': key,
                    'Authorization': `Bearer ${key}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    p_password: data1
                })
            });
            
            const data2 = await response2.json();
            console.log('Password validation result:', data2);
            
            if (data2 === true) {
                console.log('✅ Password validation works correctly');
            } else {
                console.log('❌ Password validation failed');
            }
            
        } else {
            console.log('⚠️  No admin password set or function returned empty result');
        }
        
        // Check admin_config table directly
        console.log('\n3. Checking admin_config table...');
        const tableUrl = 'https://ekklokrukxmqlahtonnc.supabase.co/rest/v1/admin_config?config_key=eq.admin_999_password';
        const response3 = await fetch(tableUrl, {
            method: 'GET',
            headers: {
                'apikey': key,
                'Authorization': `Bearer ${key}`,
                'Content-Type': 'application/json'
            }
        });
        
        const data3 = await response3.json();
        console.log('Admin config table response:', data3);
        
        if (data3 && Array.isArray(data3) && data3.length > 0) {
            console.log('✅ Admin config found in table:', {
                id: data3[0].id,
                config_key: data3[0].config_key,
                password_length: data3[0].config_value ? data3[0].config_value.length : 0,
                created_at: data3[0].created_at,
                updated_by: data3[0].updated_by
            });
        } else {
            console.log('⚠️  No admin config found in table');
        }
        
        // Check if account 999 exists
        console.log('\n4. Checking account 999 in accounts_lcmd...');
        const accountUrl = 'https://ekklokrukxmqlahtonnc.supabase.co/rest/v1/accounts_lcmd?account_number=eq.999';
        const response4 = await fetch(accountUrl, {
            method: 'GET',
            headers: {
                'apikey': key,
                'Authorization': `Bearer ${key}`,
                'Content-Type': 'application/json'
            }
        });
        
        const data4 = await response4.json();
        console.log('Account 999 response:', data4);
        
        if (data4 && Array.isArray(data4) && data4.length > 0) {
            console.log('✅ Account 999 exists:', {
                account_number: data4[0].account_number,
                acct_name: data4[0].acct_name,
                requires_password_change: data4[0].requires_password_change
            });
        } else {
            console.log('⚠️  Account 999 not found');
        }
        
    } catch (error) {
        console.error('❌ Error:', error.message);
    }
}

// For Node.js environments without fetch
if (typeof fetch === 'undefined') {
    console.log('Installing node-fetch...');
    const { default: fetch } = require('node-fetch');
    global.fetch = fetch;
}

checkAdmin999();