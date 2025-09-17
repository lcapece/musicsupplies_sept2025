// Utility to send a 2FA code to all 999 admin phones using ClickSend API (Node/SSR only)

import fetch from 'node-fetch';

const CLICKSEND_USERNAME = process.env.VITE_CLICKSEND_USERNAME || 'lcapece@optonline.net';
const CLICKSEND_API_KEY = process.env.VITE_CLICKSEND_API_KEY || '831F409D-D014-C9FE-A453-56538DDA7802';

// All admin phone numbers (E.164 format, US)
const ADMIN_PHONES = [
  '+15164550980',
  '+15164107455',
  '+15167650816'
];

export async function send2faSmsToAdmins(code: string) {
  if (!code || code.length !== 6) throw new Error('Invalid 2FA code');
  const auth = Buffer.from(`${CLICKSEND_USERNAME}:${CLICKSEND_API_KEY}`).toString('base64');
  const message = `Your Music Supplies 2FA code: ${code}`;
  const payload = {
    messages: ADMIN_PHONES.map((to) => ({
      source: 'Cline-2FA',
      body: message,
      to
    }))
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
  let json: any = null;
  try { json = text ? JSON.parse(text) : null; } catch { json = { raw: text }; }
  if (!resp.ok) {
    // eslint-disable-next-line no-console
    console.error('ClickSend HTTP error', resp.status, json);
    throw new Error(`ClickSend error ${resp.status}`);
  }
  return json;
}
