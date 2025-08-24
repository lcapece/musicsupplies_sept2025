// Simple test to send SMS to 5164550980
const fetch = require('node-fetch');

async function sendTestSMS() {
    const username = 'lcapece@optonline.net';
    const apiKey = '831F409D-D014-C9FE-A453-56538DDA7802';
    const auth = Buffer.from(`${username}:${apiKey}`).toString('base64');
    
    const payload = {
        messages: [
            {
                source: 'MusicSupplies-Test',
                body: `TEST SMS from Claude Code at ${new Date().toLocaleString()}`,
                to: '+15164550980'
            }
        ]
    };

    console.log('Sending SMS to +15164550980...');
    console.log('Payload:', JSON.stringify(payload, null, 2));

    try {
        const response = await fetch('https://rest.clicksend.com/v3/sms/send', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Basic ${auth}`
            },
            body: JSON.stringify(payload)
        });

        const result = await response.text();
        console.log(`Response Status: ${response.status}`);
        console.log('Response:', result);

        if (response.ok) {
            const data = JSON.parse(result);
            console.log('\n✅ SMS SENT SUCCESSFULLY!');
            console.log('Message ID:', data.data?.messages?.[0]?.message_id);
            console.log('Status:', data.data?.messages?.[0]?.status);
            console.log('Cost:', `$${data.data?.total_price}`);
        } else {
            console.log('\n❌ SMS FAILED');
            console.log('Error:', result);
        }
    } catch (error) {
        console.error('❌ ERROR:', error.message);
    }
}

sendTestSMS();