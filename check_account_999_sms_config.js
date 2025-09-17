// URGENT: Check SMS/2FA configuration for account 999
// This script queries all relevant tables for SMS and 2FA setup

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
    console.error('❌ Missing Supabase credentials in .env file');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function checkAccount999SMSConfig() {
    console.log('🔍 CHECKING SMS/2FA CONFIGURATION FOR ACCOUNT 999');
    console.log('='.repeat(60));

    try {
        // 1. Check app_config table for ClickSend credentials
        console.log('\n1. 📋 Checking app_config table for ClickSend credentials...');
        const { data: appConfig, error: configError } = await supabase
            .from('app_config')
            .select('*')
            .in('key', ['CLICKSEND_USERNAME', 'CLICKSEND_API_KEY']);

        if (configError) {
            console.error('❌ Error querying app_config:', configError.message);
        } else {
            console.log('✅ App config results:');
            appConfig.forEach(config => {
                console.log(`   ${config.key}: ${config.value ? '***SET***' : 'NOT SET'}`);
            });
        }

        // 2. Check accounts table for account 999
        console.log('\n2. 👤 Checking account 999 details...');
        const { data: accountData, error: accountError } = await supabase
            .from('accounts')
            .select('*')
            .eq('account_number', 999);

        if (accountError) {
            console.error('❌ Error querying accounts:', accountError.message);
        } else if (accountData && accountData.length > 0) {
            console.log('✅ Account 999 found:');
            console.log(`   ID: ${accountData[0].id}`);
            console.log(`   Email: ${accountData[0].email}`);
            console.log(`   Phone: ${accountData[0].phone || 'NOT SET'}`);
            console.log(`   2FA Enabled: ${accountData[0].two_factor_enabled || false}`);
        } else {
            console.log('❌ Account 999 NOT FOUND');
        }

        // 3. Check 2fa table for phone numbers
        console.log('\n3. 📱 Checking 2fa table for account 999...');
        const { data: twoFAData, error: twoFAError } = await supabase
            .from('2fa')
            .select('*')
            .eq('account_id', accountData?.[0]?.id);

        if (twoFAError) {
            console.error('❌ Error querying 2fa table:', twoFAError.message);
        } else if (twoFAData && twoFAData.length > 0) {
            console.log('✅ 2FA records found:');
            twoFAData.forEach(record => {
                console.log(`   Phone: ${record.phone_number || 'NOT SET'}`);
                console.log(`   Enabled: ${record.is_enabled}`);
                console.log(`   Created: ${record.created_at}`);
            });
        } else {
            console.log('❌ No 2FA records found for account 999');
        }

        // 4. Check sms_notification_settings table
        console.log('\n4. 📬 Checking sms_notification_settings table...');
        const { data: smsSettings, error: smsSettingsError } = await supabase
            .from('sms_notification_settings')
            .select('*')
            .eq('account_id', accountData?.[0]?.id);

        if (smsSettingsError) {
            console.error('❌ Error querying sms_notification_settings:', smsSettingsError.message);
        } else if (smsSettings && smsSettings.length > 0) {
            console.log('✅ SMS notification settings found:');
            smsSettings.forEach(setting => {
                console.log(`   Phone: ${setting.phone_number}`);
                console.log(`   Enabled: ${setting.enabled}`);
                console.log(`   Provider: ${setting.provider || 'NOT SET'}`);
            });
        } else {
            console.log('❌ No SMS notification settings found for account 999');
        }

        // 5. Check two_factor_codes table for recent codes
        console.log('\n5. 🔐 Checking two_factor_codes table for account 999...');
        const { data: codesData, error: codesError } = await supabase
            .from('two_factor_codes')
            .select('*')
            .eq('account_id', accountData?.[0]?.id)
            .order('created_at', { ascending: false })
            .limit(10);

        if (codesError) {
            console.error('❌ Error querying two_factor_codes:', codesError.message);
        } else if (codesData && codesData.length > 0) {
            console.log('✅ Recent 2FA codes found:');
            codesData.forEach(code => {
                console.log(`   Code: ***${code.code.slice(-3)} | Used: ${code.used} | Created: ${code.created_at}`);
            });
        } else {
            console.log('❌ No 2FA codes found for account 999');
        }

        // 6. Check for SMS logs or failed attempts (if table exists)
        console.log('\n6. 📊 Checking for SMS logs...');
        const { data: smsLogs, error: logsError } = await supabase
            .from('sms_logs')
            .select('*')
            .eq('account_id', accountData?.[0]?.id)
            .order('created_at', { ascending: false })
            .limit(10);

        if (logsError && !logsError.message.includes('does not exist')) {
            console.error('❌ Error querying sms_logs:', logsError.message);
        } else if (smsLogs && smsLogs.length > 0) {
            console.log('✅ SMS logs found:');
            smsLogs.forEach(log => {
                console.log(`   Status: ${log.status} | Phone: ${log.phone_number} | Created: ${log.created_at}`);
            });
        } else {
            console.log('ℹ️  No SMS logs table found or no logs for account 999');
        }

        // 7. List all tables to see what else might be relevant
        console.log('\n7. 📋 Available tables in the database...');
        const { data: tables, error: tablesError } = await supabase.rpc('get_tables');
        
        if (tablesError) {
            console.log('ℹ️  Could not list tables (this is normal with RLS)');
        } else {
            console.log('Available tables:', tables);
        }

    } catch (error) {
        console.error('❌ Unexpected error:', error.message);
    }

    console.log('\n' + '='.repeat(60));
    console.log('🔍 SMS/2FA CHECK COMPLETE FOR ACCOUNT 999');
}

checkAccount999SMSConfig();