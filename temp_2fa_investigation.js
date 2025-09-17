import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://ekklokrukxmqlahtonnc.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVra2xva3J1a3htcWxhaHRvbm5jIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDAwNzMxOTQsImV4cCI6MjA1NTY0OTE5NH0.LFyaAQyBb2l6rxdUAXpDQVZnR4gHDNrVZH0YudbjP3k';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function investigate2FA() {
    console.log('=== 2FA Investigation for Account 999 ===\n');
    
    // 1. Check if tables exist and get their data
    console.log('1. Checking sms_admins table:');
    try {
        const { data: smsAdmins, error: smsError } = await supabase
            .from('sms_admins')
            .select('*');
        
        if (smsError) {
            console.log('   Error or table does not exist:', smsError.message);
        } else {
            console.log('   Data:', JSON.stringify(smsAdmins, null, 2));
        }
    } catch (e) {
        console.log('   Exception:', e.message);
    }
    
    console.log('\n2. Checking admin_logins table:');
    try {
        const { data: adminLogins, error: loginError } = await supabase
            .from('admin_logins')
            .select('*')
            .eq('account_number', 999)
            .order('created_at', { ascending: false })
            .limit(10);
        
        if (loginError) {
            console.log('   Error or table does not exist:', loginError.message);
        } else {
            console.log('   Recent data for account 999:', JSON.stringify(adminLogins, null, 2));
        }
    } catch (e) {
        console.log('   Exception:', e.message);
    }
    
    console.log('\n3. Checking two_factor_codes table:');
    try {
        const { data: tfaCodes, error: tfaError } = await supabase
            .from('two_factor_codes')
            .select('*')
            .eq('account_number', 999)
            .order('created_at', { ascending: false })
            .limit(10);
        
        if (tfaError) {
            console.log('   Error or table does not exist:', tfaError.message);
        } else {
            console.log('   Recent data for account 999:', JSON.stringify(tfaCodes, null, 2));
        }
    } catch (e) {
        console.log('   Exception:', e.message);
    }
    
    console.log('\n4. Checking sms_notification_settings table:');
    try {
        const { data: smsSettings, error: settingsError } = await supabase
            .from('sms_notification_settings')
            .select('*')
            .eq('event_name', '2FA_LOGIN');
        
        if (settingsError) {
            console.log('   Error or table does not exist:', settingsError.message);
        } else {
            console.log('   2FA_LOGIN settings:', JSON.stringify(smsSettings, null, 2));
        }
    } catch (e) {
        console.log('   Exception:', e.message);
    }
    
    console.log('\n5. Checking legacy 2fa table:');
    try {
        const { data: legacy2fa, error: legacyError } = await supabase
            .from('2fa')
            .select('*');
        
        if (legacyError) {
            console.log('   Error or table does not exist:', legacyError.message);
        } else {
            console.log('   Legacy 2fa data:', JSON.stringify(legacy2fa, null, 2));
        }
    } catch (e) {
        console.log('   Exception:', e.message);
    }
    
    console.log('\n6. Testing generate_2fa_code function:');
    try {
        const { data: codeResult, error: codeError } = await supabase
            .rpc('generate_2fa_code', {
                p_account_number: 999,
                p_ip_address: '127.0.0.1',
                p_user_agent: 'Investigation Script'
            });
        
        if (codeError) {
            console.log('   Error calling generate_2fa_code:', codeError.message);
        } else {
            console.log('   Function result:', JSON.stringify(codeResult, null, 2));
        }
    } catch (e) {
        console.log('   Exception:', e.message);
    }
    
    console.log('\n=== Investigation Complete ===');
}

investigate2FA().then(() => {
    console.log('Investigation completed successfully');
    process.exit(0);
}).catch((error) => {
    console.error('Investigation failed:', error);
    process.exit(1);
});