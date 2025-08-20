// Debug SMS issue for 999 login
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://ekklokrukxmqlahtonnc.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVra2xva3J1a3htcWxhaHRvbm5jIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDAwNzMxOTQsImV4cCI6MjA1NTY0OTE5NH0.LFyaAQyBb2l6rxdUAXpDQVZnR4gHDNrVZH0YudbjP3k';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function debugSms() {
    console.log('🐞 Debugging SMS issue for 999 login...\n');
    
    try {
        // 1. Check sms_notification_settings for 2FA_LOGIN event
        console.log('1. Checking sms_notification_settings for 2FA_LOGIN event...');
        const { data: smsSettings, error: smsError } = await supabase
            .from('sms_notification_settings')
            .select('*')
            .eq('event_name', '2FA_LOGIN');
            
        if (smsError) {
            console.log('❌ Error accessing sms_notification_settings:', smsError.message);
        } else {
            console.log('✅ SMS notification settings:', smsSettings);
        }
        
        // 2. Check legacy 2fa table
        console.log('\n2. Checking legacy 2fa table...');
        const { data: twoFaTable, error: twoFaError } = await supabase
            .from('2fa')
            .select('*');
            
        if (twoFaError) {
            console.log('❌ Error accessing 2fa table:', twoFaError.message);
        } else {
            console.log('✅ Legacy 2FA table data:', twoFaTable);
        }
        
        // 3. Check two_factor_codes table for recent codes
        console.log('\n3. Checking two_factor_codes table...');
        const { data: codes, error: codesError } = await supabase
            .from('two_factor_codes')
            .select('*')
            .eq('account_number', 999)
            .order('created_at', { ascending: false })
            .limit(5);
            
        if (codesError) {
            console.log('❌ Error accessing two_factor_codes:', codesError.message);
        } else {
            console.log('✅ Recent 2FA codes for account 999:', codes);
        }
        
        // 4. Test SMS function call directly
        console.log('\n4. Testing SMS function call...');
        const { data: smsResult, error: smsCallError } = await supabase.functions.invoke('send-admin-sms', {
            body: {
                eventName: '2FA_LOGIN',
                message: 'Test SMS message',
                customPhones: ['5555551234'] // test phone
            }
        });
        
        if (smsCallError) {
            console.log('❌ SMS function error:', smsCallError);
        } else {
            console.log('✅ SMS function result:', smsResult);
        }
        
    } catch (error) {
        console.error('💥 Unexpected error:', error);
    }
}

debugSms();