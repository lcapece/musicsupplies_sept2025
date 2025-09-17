// Script to verify Supabase connection
// Run with: node verify_supabase_connection.js

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: join(__dirname, '.env') });

console.log('========================================');
console.log('   VERIFYING SUPABASE CONNECTION');
console.log('========================================\n');

// Check if environment variables are set
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

console.log('Checking environment variables...\n');

if (!supabaseUrl) {
    console.error('❌ ERROR: VITE_SUPABASE_URL is not set in .env file');
    process.exit(1);
}

if (!supabaseAnonKey) {
    console.error('❌ ERROR: VITE_SUPABASE_ANON_KEY is not set in .env file');
    process.exit(1);
}

console.log('✅ Environment variables found:');
console.log(`   URL: ${supabaseUrl}`);
console.log(`   Key: ${supabaseAnonKey.substring(0, 20)}...`);
console.log();

// Try to connect to Supabase
console.log('Testing connection to Supabase...\n');

try {
    const supabase = createClient(supabaseUrl, supabaseAnonKey);
    
    // Try a simple query to test the connection
    const { data, error } = await supabase
        .from('accounts')
        .select('count')
        .limit(1);
    
    if (error) {
        console.error('❌ Connection test failed:');
        console.error(`   ${error.message}`);
        console.log('\nPossible issues:');
        console.log('1. Check if the URL and Key are correct');
        console.log('2. Check if your Supabase project is active');
        console.log('3. Check if RLS policies allow access');
    } else {
        console.log('✅ SUCCESS: Connected to Supabase!');
        console.log('\nYour Supabase credentials are working correctly.');
        console.log('\nYou can now:');
        console.log('1. Run locally with: npm run dev');
        console.log('2. Deploy to Netlify (after adding env vars there)');
    }
} catch (err) {
    console.error('❌ Unexpected error:', err.message);
    console.log('\nPlease check your credentials and try again.');
}

console.log('\n========================================');