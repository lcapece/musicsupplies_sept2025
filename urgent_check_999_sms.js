// URGENT: Simple check for account 999 SMS configuration
import { createClient } from '@supabase/supabase-js';

// Hardcoded values from .env for urgency
const supabaseUrl = 'https://ekklokrukxmqlahtonnc.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVra2xva3J1a3htcWxhaHRvbm5jIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDAwNzMxOTQsImV4cCI6MjA1NTY0OTE5NH0.LFyaAQyBb2l6rxdUAXpDQVZnR4gHDNrVZH0YudbjP3k';

console.log('🚨 URGENT: Checking SMS/2FA for Account 999');
console.log('==========================================');

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function urgentCheck() {
    try {
        // Check accounts table first
        console.log('\n1. Checking accounts table for account 999...');
        const { data: account, error: accountError } = await supabase
            .from('accounts')
            .select('*')
            .eq('account_number', 999)
            .single();

        if (accountError) {
            console.log('❌ Account query error:', accountError.message);
            return;
        }

        if (!account) {
            console.log('❌ Account 999 NOT FOUND');
            return;
        }

        console.log('✅ Account 999 found:');
        console.log(`   ID: ${account.id}`);
        console.log(`   Email: ${account.email}`);
        console.log(`   Phone: ${account.phone || 'NOT SET'}`);
        console.log(`   2FA: ${account.two_factor_enabled || false}`);

        // Check app_config for ClickSend
        console.log('\n2. Checking app_config for ClickSend credentials...');
        const { data: config, error: configError } = await supabase
            .from('app_config')
            .select('key, value')
            .or('key.eq.CLICKSEND_USERNAME,key.eq.CLICKSEND_API_KEY');

        if (configError) {
            console.log('❌ Config error:', configError.message);
        } else {
            console.log('ClickSend Config:');
            config.forEach(item => {
                console.log(`   ${item.key}: ${item.value ? 'SET' : 'NOT SET'}`);
            });
        }

        // Check two_factor_codes
        console.log('\n3. Checking recent 2FA codes...');
        const { data: codes, error: codesError } = await supabase
            .from('two_factor_codes')
            .select('*')
            .eq('account_id', account.id)
            .order('created_at', { ascending: false })
            .limit(5);

        if (codesError) {
            console.log('❌ Codes error:', codesError.message);
        } else {
            console.log(`Found ${codes.length} recent codes`);
            codes.forEach(code => {
                console.log(`   Code ending in: ${code.code.slice(-2)} | Used: ${code.used} | ${code.created_at}`);
            });
        }

        console.log('\n==========================================');
        console.log('🚨 URGENT CHECK COMPLETE');

    } catch (error) {
        console.error('❌ Script error:', error.message);
        console.error(error.stack);
    }
}

urgentCheck();