// Test 2FA authentication flow directly
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://ekklokrukxmqlahtonnc.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVra2xva3J1a3htcWxhaHRvbm5jIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDAwNzMxOTQsImV4cCI6MjA1NTY0OTE5NH0.LFyaAQyBb2l6rxdUAXpDQVZnR4gHDNrVZH0YudbjP3k';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function test2FA() {
    console.log('🧪 Testing 2FA authentication flow...\n');
    
    try {
        // Step 1: Test initial login (should trigger 2FA requirement)
        console.log('1. Testing initial login for account 999...');
        const { data: authData, error: authError } = await supabase.rpc('authenticate_user', {
            p_identifier: '999',
            p_password: '2750GroveAvenue', // Use the correct admin password
            p_ip_address: '127.0.0.1',
            p_2fa_code: null
        });
        
        if (authError) {
            console.log('❌ Auth error:', authError);
            return;
        }
        
        console.log('✅ Auth response:', authData);
        
        if (authData && authData[0] && authData[0].requires_2fa) {
            console.log('🔐 2FA is required, as expected!');
            
            // Step 2: Check if a 2FA code was generated
            console.log('\n2. Checking for generated 2FA codes...');
            const { data: codes, error: codesError } = await supabase
                .from('two_factor_codes')
                .select('*')
                .eq('account_number', 999)
                .eq('used', false)
                .order('created_at', { ascending: false })
                .limit(1);
                
            if (codesError) {
                console.log('❌ Error checking codes:', codesError);
                return;
            }
            
            if (codes && codes.length > 0) {
                console.log('✅ 2FA code generated:', codes[0].code);
                const testCode = codes[0].code;
                
                // Step 3: Test authentication with 2FA code
                console.log('\n3. Testing authentication with 2FA code...');
                const { data: authWith2FA, error: auth2FAError } = await supabase.rpc('authenticate_user', {
                    p_identifier: '999',
                    p_password: '2750GroveAvenue',
                    p_ip_address: '127.0.0.1',
                    p_2fa_code: testCode
                });
                
                if (auth2FAError) {
                    console.log('❌ 2FA auth error:', auth2FAError);
                    return;
                }
                
                console.log('✅ 2FA authentication result:', authWith2FA);
                
                if (authWith2FA && authWith2FA[0] && authWith2FA[0].account_number === 999) {
                    console.log('🎉 2FA authentication successful!');
                } else {
                    console.log('❌ 2FA authentication failed');
                }
            } else {
                console.log('❌ No 2FA code was generated');
            }
        } else {
            console.log('❌ 2FA was not required - this might be an issue');
        }
        
    } catch (error) {
        console.error('💥 Test error:', error);
    }
}

test2FA();