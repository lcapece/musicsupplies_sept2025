// Simple Node.js script to send a test SMS via ClickSend API (ESM version)

import fetch from 'node-fetch';

const USERNAME = process.env.VITE_CLICKSEND_USERNAME || 'lcapece@optonline.net';
const API_KEY = process.env.VITE_CLICKSEND_API_KEY || '831F409D-D014-C9FE-A453-56538DDA7802';
const TO_NUMBER = '+15164550980'; // Target number (E.164 format)
const MESSAGE = 'Test SMS from ClickSend API (Cline)';

async function sendSms() {
  const auth = Buffer.from(`${USERNAME}:${API_KEY}`).toString('base64');
  const payload = {
    messages: [
      {
        source: 'Cline-NodeTest',
        body: MESSAGE,
        to: TO_NUMBER
      }
    ]
  };

  const resp = await fetch('https://rest.clicksend.com/v3/sms/send', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Basic ${auth}`
    },
    body: JSON.stringify(payload)
  });

  const text = await resp.text().catch(() => '');
  let json = null;
  try { json = text ? JSON.parse(text) : null; } catch { json = { raw: text }; }
  if (!resp.ok) {
    console.error('ClickSend HTTP error', resp.status, json);
    process.exit(1);
  }
  console.log('SMS sent successfully:', json);
}

await sendSms().catch((err) => {
  console.error('Error sending SMS:', err);
  process.exit(1);
});
