// Test SMS sending to 5164550980
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

async function sendTestSMS() {
    console.log('📱 SENDING TEST SMS TO 5164550980');
    console.log('='.repeat(50));

    try {
        // Call the send-admin-sms function with custom phone number
        const { data, error } = await supabase.functions.invoke('send-admin-sms', {
            body: {
                eventName: 'test_message',
                message: 'TEST MESSAGE: This is a test SMS from Music Supplies system. Time: ' + new Date().toLocaleString(),
                customPhones: ['+15164550980']
            }
        });

        if (error) {
            console.error('❌ Error calling send-admin-sms function:', error);
            return;
        }

        console.log('✅ SMS Function Response:', JSON.stringify(data, null, 2));

        if (data.success) {
            console.log('🎉 SMS sent successfully!');
            console.log(`📊 Results: ${data.message}`);
            if (data.results) {
                data.results.forEach(result => {
                    console.log(`   📞 ${result.phone}: ${result.success ? '✅ SUCCESS' : '❌ FAILED'}`);
                    if (!result.success) {
                        console.log(`      Error: ${result.error}`);
                    }
                });
            }
        } else {
            console.log('❌ SMS sending failed:', data.message || 'Unknown error');
        }

    } catch (error) {
        console.error('❌ Unexpected error:', error.message);
    }

    console.log('\n' + '='.repeat(50));
    console.log('📱 TEST SMS COMPLETE');
}

sendTestSMS();