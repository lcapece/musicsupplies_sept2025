// Supabase Edge Function: Send 2FA code to all admin phones via ClickSend

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const CLICKSEND_USERNAME = Deno.env.get("VITE_CLICKSEND_USERNAME") || "lcapece@optonline.net";
const CLICKSEND_API_KEY = Deno.env.get("VITE_CLICKSEND_API_KEY") || "831F409D-D014-C9FE-A453-56538DDA7802";

// Fallback admin phone numbers (E.164 format, US)
const FALLBACK_ADMIN_PHONES = [
  "+15164550980",
  "+15164107455",
  "+15167650816"
];

// Function to get admin phone numbers from sms_admins table
async function getAdminPhones() {
  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY") || "";
    
    const response = await fetch(`${supabaseUrl}/rest/v1/sms_admins?is_active=eq.true&select=phone_number`, {
      headers: {
        "apikey": anonKey,
        "Authorization": `Bearer ${anonKey}`,
        "Content-Type": "application/json"
      }
    });
    
    if (response.ok) {
      const data = await response.json();
      if (Array.isArray(data) && data.length > 0) {
        return data
          .map(row => row.phone_number)
          .filter(phone => phone && typeof phone === 'string')
          .map(phone => phone.trim())
          .map(phone => phone.startsWith("+") ? phone : `+1${phone}`);
      }
    }
  } catch (err) {
    console.error("Failed to fetch admin phones from sms_admins:", err);
  }
  
  // Fallback to hardcoded phones
  return FALLBACK_ADMIN_PHONES;
}

serve(async (req) => {
  if (req.method !== "POST") {
    return new Response("Method Not Allowed", { status: 405 });
  }

  let code: string | undefined;
  try {
    const { code: bodyCode } = await req.json();
    code = bodyCode;
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON" }), { status: 400 });
  }

  if (!code || typeof code !== "string" || code.length !== 6) {
    return new Response(JSON.stringify({ error: "Invalid 2FA code" }), { status: 400 });
  }

  const adminPhones = await getAdminPhones();
  const auth = btoa(`${CLICKSEND_USERNAME}:${CLICKSEND_API_KEY}`);
  const message = `Your Music Supplies 2FA code: ${code}`;
  const payload = {
    messages: adminPhones.map((to) => ({
      source: "Cline-2FA",
      body: message,
      to
    }))
  };

  const resp = await fetch("https://rest.clicksend.com/v3/sms/send", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Basic ${auth}`
    },
    body: JSON.stringify(payload)
  });

  const text = await resp.text().catch(() => "");
  let json: any = null;
  try { json = text ? JSON.parse(text) : null; } catch { json = { raw: text }; }
  if (!resp.ok) {
    return new Response(JSON.stringify({ error: "ClickSend error", status: resp.status, details: json }), { status: 500 });
  }

  return new Response(JSON.stringify({ success: true, result: json }), { status: 200 });
});
