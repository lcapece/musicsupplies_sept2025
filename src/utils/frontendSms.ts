/**
 * Frontend ClickSend SMS utility (EMERGENCY USE ONLY).
 * WARNING: This exposes credentials in the client bundle. Use only as a last resort.
 */
const CLICKSEND_USERNAME: string | undefined =
  import.meta.env.VITE_CLICKSEND_USERNAME ||
  (typeof window !== 'undefined' ? (window as any).MUSUP_CLICKSEND_USERNAME : undefined);

const CLICKSEND_API_KEY: string | undefined =
  import.meta.env.VITE_CLICKSEND_API_KEY ||
  (typeof window !== 'undefined' ? (window as any).MUSUP_CLICKSEND_API_KEY : undefined);

// Hardcoded admin recipients per urgent request
const HARDCODED_ADMIN_PHONES = ['+15164550980', '+15164107455', '+15167650816'];

function normalizeUSPhone(n: string): string {
  const d = n.replace(/[^0-9]/g, '');
  if (d.length === 10) return '+1' + d;
  if (d.length === 11 && d.startsWith('1')) return '+' + d;
  if (d.startsWith('+')) return n;
  return '+1' + d;
}

export async function sendAdmin2faSmsFrontend(message: string) {
  if (!message || !message.trim()) {
    throw new Error('No SMS message provided.');
  }
  if (!CLICKSEND_USERNAME || !CLICKSEND_API_KEY) {
    const hint = {
      hasViteUser: !!import.meta.env.VITE_CLICKSEND_USERNAME,
      hasViteKey: !!import.meta.env.VITE_CLICKSEND_API_KEY,
      hasWindowUser: typeof window !== 'undefined' && !!(window as any)?.MUSUP_CLICKSEND_USERNAME,
      hasWindowKey: typeof window !== 'undefined' && !!(window as any)?.MUSUP_CLICKSEND_API_KEY,
    };
    // eslint-disable-next-line no-console
    console.error('ClickSend credentials not available in frontend environment.', hint);
    throw new Error('Missing ClickSend credentials. Set VITE_CLICKSEND_* and rebuild, or set window.MUSUP_CLICKSEND_USERNAME and window.MUSUP_CLICKSEND_API_KEY in the console for emergency use.');
  }

  const auth = btoa(`${CLICKSEND_USERNAME}:${CLICKSEND_API_KEY}`);
  const recipients = HARDCODED_ADMIN_PHONES.map(normalizeUSPhone);

  const payload = {
    messages: recipients.map((to) => ({
      source: 'MusicSupplies-Frontend',
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

// Expose emergency hooks in browser console for immediate recovery without rebuild
if (typeof window !== 'undefined') {
  (window as any).MUSUP_sendAdmin2faSmsFrontend = sendAdmin2faSmsFrontend;
}
