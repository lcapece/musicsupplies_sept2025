// Quick script to check admin_config table and user 999 password status
import { createClient } from '@supabase/supabase-js';

// Or use the values from .env directly
const SUPABASE_URL = 'https://ekklokrukxmqlahtonnc.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVra2xva3J1a3htcWxhaHRvbm5jIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDAwNzMxOTQsImV4cCI6MjA1NTY0OTE5NH0.LFyaAQyBb2l6rxdUAXpDQVZnR4gHDNrVZH0YudbjP3k';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function checkAdminConfig() {
    console.log('🔍 Checking admin configuration...');
    
    try {
        // Check if admin_config table exists and get admin password
        console.log('\n1. Checking admin_config table...');
        const { data: adminConfig, error: configError } = await supabase
            .from('admin_config')
            .select('*')
            .eq('config_key', 'admin_999_password');

        if (configError) {
            console.log('❌ Error accessing admin_config table:', configError.message);
        } else if (adminConfig && adminConfig.length > 0) {
            console.log('✅ Admin config found:', {
                id: adminConfig[0].id,
                config_key: adminConfig[0].config_key,
                password_set: adminConfig[0].config_value ? 'YES' : 'NO',
                password_length: adminConfig[0].config_value ? adminConfig[0].config_value.length : 0,
                created_at: adminConfig[0].created_at,
                updated_at: adminConfig[0].updated_at,
                updated_by: adminConfig[0].updated_by
            });
        } else {
            console.log('⚠️  No admin password config found in admin_config table');
        }

        // Check account 999 in accounts_lcmd
        console.log('\n2. Checking account 999 in accounts_lcmd...');
        const { data: account999, error: accountError } = await supabase
            .from('accounts_lcmd')
            .select('account_number, acct_name, requires_password_change')
            .eq('account_number', 999);

        if (accountError) {
            console.log('❌ Error accessing accounts_lcmd table:', accountError.message);
        } else if (account999 && account999.length > 0) {
            console.log('✅ Account 999 found:', account999[0]);
        } else {
            console.log('⚠️  Account 999 not found in accounts_lcmd table');
        }

        // Check logon_lcmd table for account 999
        console.log('\n3. Checking logon_lcmd table for account 999...');
        const { data: logon999, error: logonError } = await supabase
            .from('logon_lcmd')
            .select('account_number, password, created_at, updated_at')
            .eq('account_number', 999);

        if (logonError) {
            console.log('❌ Error accessing logon_lcmd table:', logonError.message);
        } else if (logon999 && logon999.length > 0) {
            console.log('✅ Login record for account 999 found:', {
                account_number: logon999[0].account_number,
                password_set: logon999[0].password ? 'YES' : 'NO',
                password_length: logon999[0].password ? logon999[0].password.length : 0,
                created_at: logon999[0].created_at,
                updated_at: logon999[0].updated_at
            });
        } else {
            console.log('⚠️  No login record found for account 999 in logon_lcmd table');
        }

        // Test the validate_admin_password function
        console.log('\n4. Testing validate_admin_password function...');
        const { data: validateResult, error: validateError } = await supabase.rpc('validate_admin_password', {
            p_password: '2750GroveAvenue'
        });

        if (validateError) {
            console.log('❌ Error calling validate_admin_password function:', validateError.message);
        } else {
            console.log('✅ validate_admin_password function result:', validateResult);
        }

        // Test the get_admin_password function
        console.log('\n5. Testing get_admin_password function...');
        const { data: getPasswordResult, error: getPasswordError } = await supabase.rpc('get_admin_password');

        if (getPasswordError) {
            console.log('❌ Error calling get_admin_password function:', getPasswordError.message);
        } else {
            console.log('✅ get_admin_password function result:', {
                password_retrieved: getPasswordResult ? 'YES' : 'NO',
                password_length: getPasswordResult ? getPasswordResult.length : 0
            });
        }

    } catch (error) {
        console.error('💥 Unexpected error:', error);
    }
}

checkAdminConfig();