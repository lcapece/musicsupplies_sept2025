// Diagnostic script to trace the exact login flow
console.log('=== LOGIN FLOW DIAGNOSTIC ===\n');

// 1. Check what's in the built JavaScript
console.log('1. Checking if Music123 block exists in built code...');
const fs = require('fs');
const path = require('path');

// Check if dist folder exists
const distPath = path.join(__dirname, 'dist');
if (fs.existsSync(distPath)) {
    const files = fs.readdirSync(distPath).filter(f => f.endsWith('.js'));
    
    for (const file of files) {
        const content = fs.readFileSync(path.join(distPath, file), 'utf8');
        if (content.includes('NUCLEAR BLOCK') || content.includes('Music123')) {
            console.log(`   ✅ Found Music123 block in ${file}`);
        }
        if (content.includes('authenticate_user_v5')) {
            console.log(`   📞 Found authenticate_user_v5 call in ${file}`);
        }
        if (content.includes('authenticate_user_v6')) {
            console.log(`   📞 Found authenticate_user_v6 call in ${file}`);
        }
    }
}

// 2. Test direct RPC calls
console.log('\n2. Testing direct RPC calls to Supabase...');
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://ekklokrukxmqlahtonnc.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVra2xva3J1a3htcWxhaHRvbm5jIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDAwNzMxOTQsImV4cCI6MjA1NTY0OTE5NH0.LFyaAQyBb2l6rxdUAXpDQVZnR4gHDNrVZH0YudbjP3k';

const supabase = createClient(supabaseUrl, supabaseKey);

async function testAllPaths() {
    // Test v5
    console.log('\n   Testing authenticate_user_v5:');
    try {
        const { data, error } = await supabase.rpc('authenticate_user_v5', {
            p_identifier: '999',
            p_password: 'Music123',
            p_ip_address: 'diagnostic'
        });
        
        if (error) {
            console.log('   Error:', error.message);
        } else if (data && data.length > 0) {
            console.log('   ❌❌❌ CRITICAL: Music123 WORKS on v5!');
            console.log('   Account returned:', data[0].account_number);
        } else {
            console.log('   ✅ Good: Music123 blocked on v5');
        }
    } catch (e) {
        console.log('   Function v5 not found or error:', e.message);
    }
    
    // Test v6
    console.log('\n   Testing authenticate_user_v6:');
    try {
        const { data, error } = await supabase.rpc('authenticate_user_v6', {
            p_identifier: '999',
            p_password: 'Music123',
            p_ip_address: 'diagnostic'
        });
        
        if (error) {
            console.log('   Error:', error.message);
        } else if (data && data.length > 0) {
            console.log('   ❌❌❌ CRITICAL: Music123 WORKS on v6!');
            console.log('   Account returned:', data[0].account_number);
        } else {
            console.log('   ✅ Good: Music123 blocked on v6');
        }
    } catch (e) {
        console.log('   Function v6 not found or error:', e.message);
    }
    
    // Check recent login attempts
    console.log('\n3. Checking recent login attempts in app_events...');
    const { data: events } = await supabase
        .from('app_events')
        .select('*')
        .or('event_type.eq.AUTH_ATTEMPT_V6,event_type.eq.NUCLEAR_BLOCK_FRONTEND,event_type.eq.BLOCKED_V6')
        .order('created_at', { ascending: false })
        .limit(10);
    
    if (events && events.length > 0) {
        console.log(`   Found ${events.length} recent auth events:`);
        events.forEach(e => {
            console.log(`   - ${e.event_type}: ${e.event_name} at ${e.created_at}`);
            if (e.event_data?.password_first_3) {
                console.log(`     Password starts with: ${e.event_data.password_first_3}`);
            }
        });
    } else {
        console.log('   No recent auth events found');
    }
}

testAllPaths().catch(console.error);