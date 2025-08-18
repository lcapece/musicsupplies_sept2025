const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://ekklokrukxmqlahtonnc.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVra2xva3J1a3htcWxhaHRvbm5jIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDAwNzMxOTQsImV4cCI6MjA1NTY0OTE5NH0.LFyaAQyBb2l6rxdUAXpDQVZnR4gHDNrVZH0YudbjP3k';

const supabase = createClient(supabaseUrl, supabaseKey);

async function searchFunctions() {
    console.log('=== SEARCHING FOR MUSIC123 IN DATABASE FUNCTIONS ===\n');
    
    // Query pg_proc directly using raw SQL
    const { data, error } = await supabase.rpc('query_database', {
        query_text: `
            SELECT 
                proname AS function_name,
                LENGTH(prosrc) AS source_length,
                CASE 
                    WHEN prosrc ILIKE '%music123%' THEN 'DANGER: Contains Music123'
                    WHEN prosrc ILIKE '%music%' THEN 'Warning: Contains music'
                    WHEN prosrc ILIKE '%2750grove%' THEN 'Good: Contains 2750grove'
                    ELSE 'Clean'
                END AS content_check,
                prosrc AS full_source
            FROM pg_proc 
            WHERE proname LIKE 'authenticate_user%'
            ORDER BY proname;
        `
    }).catch(async (e) => {
        // Try alternative approach
        console.log('Direct query failed, trying alternative...\n');
        
        // Just test the functions directly
        console.log('Testing authenticate_user_v5 with Music123:');
        const { data: v5Test, error: v5Error } = await supabase.rpc('authenticate_user_v5', {
            p_identifier: '999',
            p_password: 'Music123',
            p_ip_address: 'search_test'
        });
        
        if (v5Error) {
            console.log('Error:', v5Error.message);
        } else if (v5Test && v5Test.length > 0) {
            console.log('❌❌❌ CRITICAL: Music123 WORKS in v5!');
            console.log('Account returned:', v5Test[0]);
        } else {
            console.log('✅ Good: Music123 blocked in v5');
        }
        
        console.log('\nTesting authenticate_user_v6 with Music123:');
        const { data: v6Test, error: v6Error } = await supabase.rpc('authenticate_user_v6', {
            p_identifier: '999',
            p_password: 'Music123',
            p_ip_address: 'search_test'
        });
        
        if (v6Error) {
            console.log('Error:', v6Error.message);
        } else if (v6Test && v6Test.length > 0) {
            console.log('❌❌❌ CRITICAL: Music123 WORKS in v6!');
            console.log('Account returned:', v6Test[0]);
        } else {
            console.log('✅ Good: Music123 blocked in v6');
        }
        
        // Test with 2750grove
        console.log('\nTesting with correct password 2750grove:');
        const { data: correctTest, error: correctError } = await supabase.rpc('authenticate_user_v5', {
            p_identifier: '999',
            p_password: '2750grove',
            p_ip_address: 'search_test'
        });
        
        if (correctError) {
            console.log('Error:', correctError.message);
        } else if (correctTest && correctTest.length > 0) {
            console.log('✅ Good: 2750grove works!');
        } else {
            console.log('❌ Problem: 2750grove does not work');
        }
        
        return { data: null, error: e };
    });
    
    if (data) {
        console.log('Function analysis results:');
        data.forEach(func => {
            console.log(`\nFunction: ${func.function_name}`);
            console.log(`Source size: ${func.source_length} chars`);
            console.log(`Check result: ${func.content_check}`);
            if (func.content_check.includes('DANGER')) {
                console.log('⚠️⚠️⚠️ CRITICAL FINDING: Function contains Music123!');
                // Show relevant part of source
                const sourceSnippet = func.full_source.substring(0, 500);
                console.log('Source snippet:', sourceSnippet);
            }
        });
    }
}

searchFunctions().catch(console.error);