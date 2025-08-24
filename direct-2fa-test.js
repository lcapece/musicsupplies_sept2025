// Direct 2FA Test for Windows Environment
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://ekklokrukxmqlahtonnc.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVra2xva3J1a3htcWxhaHRvbm5jIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDAwNzMxOTQsImV4cCI6MjA1NTY0OTE5NH0.LFyaAQyBb2l6rxdUAXpDQVZnR4gHDNrVZH0YudbjP3k';

console.log('Starting 2FA Direct Test...');
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function test2FA() {
    console.log('\n=== 2FA SYSTEM TEST ===');

    // Test 1: Check sms_admins table
    console.log('\n1. Checking sms_admins table...');
    try {
        const { data, error } = await supabase
            .from('sms_admins')
            .select('*')
            .eq('is_active', true);

        if (error) {
            console.log('ERROR:', error.message);
        } else {
            console.log('SUCCESS: Found active SMS admins:');
            data.forEach(admin => {
                console.log(`  - ${admin.phone_number}: ${admin.notes || 'No notes'}`);
            });
        }
    } catch (e) {
        console.log('EXCEPTION:', e.message);
    }

    // Test 2: Check admin_logins table
    console.log('\n2. Checking admin_logins table for account 999...');
    try {
        const { data, error } = await supabase
            .from('admin_logins')
            .select('*')
            .eq('account_number', 999)
            .order('created_at', { ascending: false })
            .limit(5);

        if (error) {
            console.log('ERROR:', error.message);
        } else {
            console.log(`SUCCESS: Found ${data.length} admin login entries for account 999:`);
            data.forEach((entry, index) => {
                const isExpired = new Date(entry.expires_at) < new Date();
                const status = entry.used ? 'USED' : isExpired ? 'EXPIRED' : 'ACTIVE';
                console.log(`  ${index + 1}. Code: ${entry.code}, Status: ${status}, IP: ${entry.ip_address}`);
            });
        }
    } catch (e) {
        console.log('EXCEPTION:', e.message);
    }

    // Test 3: Generate 2FA code
    console.log('\n3. Testing generate_2fa_code function...');
    try {
        const { data, error } = await supabase.rpc('generate_2fa_code', {
            p_account_number: 999,
            p_ip_address: '127.0.0.1',
            p_user_agent: 'Direct-Test-Script'
        });

        if (error) {
            console.log('ERROR:', error.message);
        } else {
            console.log('SUCCESS: Generated 2FA code:');
            console.log(`  ID: ${data.id}`);
            console.log(`  Code: ${data.code}`);
            console.log(`  Created: ${data.created_at}`);
            console.log(`  Expires: ${data.expires_at}`);
        }
    } catch (e) {
        console.log('EXCEPTION:', e.message);
    }

    // Test 4: Check updated admin_logins table
    console.log('\n4. Checking if new code was inserted...');
    try {
        const { data, error } = await supabase
            .from('admin_logins')
            .select('*')
            .eq('account_number', 999)
            .order('created_at', { ascending: false })
            .limit(3);

        if (error) {
            console.log('ERROR:', error.message);
        } else {
            console.log(`SUCCESS: Latest ${data.length} entries:`);
            data.forEach((entry, index) => {
                const isExpired = new Date(entry.expires_at) < new Date();
                const status = entry.used ? 'USED' : isExpired ? 'EXPIRED' : 'ACTIVE';
                console.log(`  ${index + 1}. Code: ${entry.code}, Status: ${status}, Created: ${entry.created_at}`);
            });
        }
    } catch (e) {
        console.log('EXCEPTION:', e.message);
    }

    // Test 5: Test code validation
    console.log('\n5. Testing validate_admin_login_code function...');
    try {
        // Test with invalid code first
        const { data: invalidResult, error: invalidError } = await supabase.rpc('validate_admin_login_code', {
            p_account_number: 999,
            p_code: '999999'
        });

        if (invalidError) {
            console.log('ERROR with invalid code:', invalidError.message);
        } else {
            console.log(`Invalid code test result: ${invalidResult} (should be false)`);
        }

        // Get a valid unused code if available
        const { data: validCodes, error: validError } = await supabase
            .from('admin_logins')
            .select('*')
            .eq('account_number', 999)
            .eq('used', false)
            .gte('expires_at', new Date().toISOString())
            .order('created_at', { ascending: false })
            .limit(1);

        if (validError || !validCodes || validCodes.length === 0) {
            console.log('No valid unused codes available for validation test');
        } else {
            const testCode = validCodes[0].code;
            console.log(`Testing validation with real code: ${testCode}`);

            const { data: validResult, error: validationError } = await supabase.rpc('validate_admin_login_code', {
                p_account_number: 999,
                p_code: testCode
            });

            if (validationError) {
                console.log('ERROR with valid code:', validationError.message);
            } else {
                console.log(`Valid code test result: ${validResult} (should be true)`);
            }
        }
    } catch (e) {
        console.log('EXCEPTION:', e.message);
    }

    console.log('\n=== TEST COMPLETE ===');
}

test2FA().catch(error => {
    console.error('Test failed:', error);
});