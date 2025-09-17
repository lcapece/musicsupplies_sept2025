// Simple ClickSend SMS test
const https = require('https');

// ClickSend credentials (replace with your actual credentials)
const CLICKSEND_USERNAME = 'your_username';
const CLICKSEND_API_KEY = 'your_api_key';
const ADMIN_PHONE = '+15164107455'; // Your admin phone number

// Generate a 6-digit 2FA code
const twoFactorCode = Math.floor(100000 + Math.random() * 900000).toString();
console.log('Generated 2FA code:', twoFactorCode);

// ClickSend SMS message
const smsData = {
    messages: [
        {
            body: `Your 2FA verification code is: ${twoFactorCode}`,
            to: ADMIN_PHONE,
            source: 'Music Supplies'
        }
    ]
};

// ClickSend API request
const postData = JSON.stringify(smsData);
const auth = Buffer.from(`${CLICKSEND_USERNAME}:${CLICKSEND_API_KEY}`).toString('base64');

const options = {
    hostname: 'rest.clicksend.com',
    port: 443,
    path: '/v3/sms/send',
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData),
        'Authorization': `Basic ${auth}`
    }
};

console.log('Sending SMS via ClickSend...');

const req = https.request(options, (res) => {
    console.log('Status Code:', res.statusCode);
    console.log('Headers:', res.headers);
    
    let data = '';
    res.on('data', (chunk) => {
        data += chunk;
    });
    
    res.on('end', () => {
        console.log('ClickSend Response:', JSON.parse(data));
        
        if (res.statusCode === 200) {
            console.log('✅ SMS sent successfully!');
            console.log(`📱 Check your phone ${ADMIN_PHONE} for the code: ${twoFactorCode}`);
        } else {
            console.log('❌ SMS failed to send');
        }
    });
});

req.on('error', (e) => {
    console.error('❌ Request error:', e);
});

req.write(postData);
req.end();