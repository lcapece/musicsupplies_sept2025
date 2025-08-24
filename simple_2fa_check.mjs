import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://ekklokrukxmqlahtonnc.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVra2xva3J1a3htcWxhaHRvbm5jIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDAwNzMxOTQsImV4cCI6MjA1NTY0OTE5NH0.LFyaAQyBb2l6rxdUAXpDQVZnR4gHDNrVZH0YudbjP3k';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

console.log('Starting 2FA investigation...');

try {
    // Check 1: sms_admins table
    const { data: smsAdmins, error: smsError } = await supabase
        .from('sms_admins')
        .select('*');
    
    console.log('sms_admins table:');
    if (smsError) {
        console.log('  Error:', smsError.message);
    } else {
        console.log('  Data:', JSON.stringify(smsAdmins, null, 2));
    }

    // Check 2: admin_logins table for account 999
    const { data: adminLogins, error: loginError } = await supabase
        .from('admin_logins')
        .select('*')
        .eq('account_number', 999)
        .order('created_at', { ascending: false })
        .limit(5);
    
    console.log('\nadmin_logins table (account 999):');
    if (loginError) {
        console.log('  Error:', loginError.message);
    } else {
        console.log('  Data:', JSON.stringify(adminLogins, null, 2));
    }

    // Check 3: Test generate_2fa_code function
    console.log('\nTesting generate_2fa_code function...');
    const { data: codeResult, error: codeError } = await supabase
        .rpc('generate_2fa_code', {
            p_account_number: 999,
            p_ip_address: '127.0.0.1'
        });
    
    if (codeError) {
        console.log('  Function error:', codeError.message);
    } else {
        console.log('  Function result:', JSON.stringify(codeResult, null, 2));
    }

} catch (error) {
    console.error('Script error:', error);
}

console.log('Investigation complete.');