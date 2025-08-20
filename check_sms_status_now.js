// Use Supabase existing functions to check SMS status
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    'https://ekklokrukxmqlahtonnc.supabase.co',
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVra2xva3J1a3htcWxhaHRvbm5jIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDAwNzMxOTQsImV4cCI6MjA1NTY0OTE5NH0.LFyaAQyBb2l6rxdUAXpDQVZnR4gHDNrVZH0YudbjP3k'
);

console.log('🚨 URGENT SMS STATUS CHECK FOR ACCOUNT 999');
console.log('===============================================\n');

async function checkSMSStatus() {
    try {
        // Use the get_sms_status function that was created in the migration
        console.log('Calling get_sms_status() function...');
        const { data: status, error: statusError } = await supabase.rpc('get_sms_status');
        
        if (statusError) {
            console.error('❌ Error calling get_sms_status:', statusError.message);
        } else {
            console.log('✅ SMS Status Results:');
            console.log(JSON.stringify(status, null, 2));
        }

        // Also use the test_sms_config function
        console.log('\nCalling test_sms_config() function...');
        const { data: testResults, error: testError } = await supabase.rpc('test_sms_config');
        
        if (testError) {
            console.error('❌ Error calling test_sms_config:', testError.message);
        } else {
            console.log('✅ SMS Config Test Results:');
            testResults.forEach(result => {
                console.log(`${result.table_name}: EXISTS=${result.exists_check}, COUNT=${result.record_count}`);
                console.log(`   Description: ${result.description}\n`);
            });
        }

        // Check account 999 specifically
        console.log('Checking account 999 directly...');
        const { data: account999, error: account999Error } = await supabase
            .from('accounts_lcmd')
            .select('*')
            .eq('account_number', 999)
            .single();
            
        if (account999Error) {
            console.error('❌ Error checking account 999:', account999Error.message);
        } else {
            console.log('✅ Account 999 details:');
            console.log(`   Name: ${account999.acct_name}`);
            console.log(`   Phone: ${account999.phone}`);
            console.log(`   Mobile: ${account999.mobile_phone}`);
            console.log(`   Email: ${account999.email_address}\n`);
        }

        // Check 2FA phone numbers
        console.log('Checking 2FA phone numbers...');
        const { data: twoFAPhones, error: twoFAError } = await supabase
            .from('2fa')
            .select('*');
            
        if (twoFAError) {
            console.error('❌ Error checking 2FA phones:', twoFAError.message);
        } else {
            console.log('✅ 2FA Phone Numbers:');
            twoFAPhones.forEach(phone => {
                console.log(`   ${phone.phonenumber} (ID: ${phone.id})`);
            });
        }

    } catch (error) {
        console.error('❌ Unexpected error:', error);
    }
}

checkSMSStatus().then(() => {
    console.log('\n===============================================');
    console.log('🚨 SMS STATUS CHECK COMPLETE');
});