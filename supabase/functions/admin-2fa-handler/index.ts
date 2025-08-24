// Supabase Edge Function: Admin 2FA Handler for 999 login

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

// Use proper Edge secrets
const CLICKSEND_USERNAME = Deno.env.get("CLICKSEND_USERID");
const CLICKSEND_API_KEY = Deno.env.get("CLICKSEND_API_KEY");

// Fallback admin phones if sms_admins table is empty
const ADMIN_PHONES = [
  "+15164550980",
  "+15164107455",
  "+15167650816"
];

async function sendSms(code: string) {
  const auth = btoa(`${CLICKSEND_USERNAME}:${CLICKSEND_API_KEY}`);
  const message = `Your Music Supplies 2FA code: ${code}`;
  const payload = {
    messages: ADMIN_PHONES.map((to) => ({
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
  return resp.ok;
}

serve(async (req) => {
  const url = new URL(req.url);
  // Handle paths more flexibly - remove leading/trailing slashes and handle nested paths
  let path = url.pathname.replace(/^\/+|\/+$/g, "");
  
  // Extract the last segment if it's a nested path (e.g., "admin-2fa-handler/generate" -> "generate")
  const pathSegments = path.split('/');
  const lastSegment = pathSegments[pathSegments.length - 1];

  console.log("Admin 2FA Handler - Full Path:", path, "Last Segment:", lastSegment, "Method:", req.method);

  if (req.method === "POST" && (lastSegment === "generate" || path === "generate")) {
    // Generate and store code
    const { account_number } = await req.json().catch(() => ({}));
    if (account_number !== 999) {
      return new Response(JSON.stringify({ error: "Only 999 supported" }), { status: 400 });
    }
    // Generate a 6-digit code (allow leading zeros), store raw integer, and set a 90-second expiry
    const rawCode = Math.floor(Math.random() * 1000000); // 0..999999
    const code = String(rawCode).padStart(6, "0");
    const expires = new Date(Date.now() + 90 * 1000).toISOString(); // 90 second expiry

    // Insert into admin_logins table and return representation so we can patch with ClickSend response later
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY") || "";

    const insertResp = await fetch(`${supabaseUrl}/rest/v1/admin_logins`, {
      method: "POST",
      headers: {
        "apikey": anonKey,
        "Authorization": `Bearer ${anonKey}`,
        "Content-Type": "application/json",
        "Prefer": "return=representation"
      },
      body: JSON.stringify({
        account_number: 999,
        code: code,
        expires_at: expires,
        used: false,
        ip_address: '127.0.0.1',
        user_agent: 'Edge Function'
      })
    }).then(r => r.json()).catch(err => ({ error: err }));

    if (insertResp && insertResp.error) {
      return new Response(JSON.stringify({ error: "DB insert failed", details: insertResp.error }), { status: 500 });
    }

    // Determine recipients:
    // Query sms_admins for all active phone numbers
    let recipients: string[] = [];
    try {
      const phonesResp = await fetch(`${supabaseUrl}/rest/v1/sms_admins?select=phone_number&is_active=eq.true`, {
        headers: {
          "apikey": anonKey,
          "Authorization": `Bearer ${anonKey}`,
          "Content-Type": "application/json"
        }
      });
      if (phonesResp.ok) {
        const rows = await phonesResp.json();
        if (Array.isArray(rows) && rows.length > 0) {
          recipients = rows
            .map(r => r?.phone_number)
            .filter(Boolean)
            .map(p => String(p).trim())
            .map(p => p.startsWith("+") ? p : `+1${p}`); // Ensure US format
        }
      }
    } catch (err) {
      console.error("Failed to query sms_admins:", err);
    }

    // Fallback to legacy two_factor_codes if sms_admins is empty (compatibility)
    if (recipients.length === 0) {
      console.log("No recipients found in sms_admins, using fallback admin phones");
    }

    // Final fallback to hardcoded ADMIN_PHONES
    if (recipients.length === 0) {
      recipients = ADMIN_PHONES.slice();
    }

    if (!recipients || recipients.length === 0) {
      return new Response(JSON.stringify({ success: true, message: "No phone numbers found in tbl_2fa for account 999" }), { status: 200 });
    }

    // Send SMS to resolved recipients via ClickSend (use same auth as sendSms)
    const auth = btoa(`${CLICKSEND_USERNAME}:${CLICKSEND_API_KEY}`);
    const message = `Your Music Supplies 2FA code: ${code}`;
    const payload = {
      messages: recipients.map((to) => ({
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

    let respJson = null;
    try { respJson = await resp.json(); } catch { respJson = { raw: await resp.text().catch(() => "") }; }

    // If ClickSend failed, return error but keep the DB record for inspection
    if (!resp.ok) {
      return new Response(JSON.stringify({ error: "SMS send failed", status: resp.status, details: respJson }), { status: 500 });
    }

    // Patch the inserted admin_logins row with ClickSend response for auditing, if we have an id
    try {
      const insertedId = Array.isArray(insertResp) && insertResp[0] && insertResp[0].id ? insertResp[0].id : null;
      if (insertedId) {
        await fetch(`${supabaseUrl}/rest/v1/admin_logins?id=eq.${insertedId}`, {
          method: "PATCH",
          headers: {
            "apikey": anonKey,
            "Authorization": `Bearer ${anonKey}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({ 
            clicksend_response: respJson,
            ip_address: '127.0.0.1',
            user_agent: 'Edge Function Updated'
          })
        });
      }
    } catch (err) {
      // non-fatal
      console.error("Failed to patch admin_logins with ClickSend response:", (err as Error).message);
    }

    return new Response(JSON.stringify({ success: true, sent_to: recipients.length, clicksend: respJson }), { status: 200 });
  }

  if (req.method === "POST" && (lastSegment === "verify" || path === "verify")) {
    // Verify code
    const { account_number, code } = await req.json().catch(() => ({}));
    if (account_number !== 999 || (code === undefined || code === null)) {
      return new Response(JSON.stringify({ error: "Invalid input" }), { status: 400 });
    }
    const codeInt = parseInt(String(code), 10);
    if (Number.isNaN(codeInt)) {
      return new Response(JSON.stringify({ valid: false }), { status: 200 });
    }
    // Query for valid code in admin_logins table
    const res = await fetch(`${Deno.env.get("SUPABASE_URL")}/rest/v1/admin_logins?account_number=eq.999&code=eq.${String(codeInt).padStart(6, '0')}&used=eq.false&expires_at=gt.${new Date().toISOString()}`, {
      headers: {
        "apikey": Deno.env.get("SUPABASE_ANON_KEY") || "",
        "Authorization": `Bearer ${Deno.env.get("SUPABASE_ANON_KEY") || ""}`
      }
    });
    const data = await res.json();
    if (!Array.isArray(data) || data.length === 0) {
      return new Response(JSON.stringify({ valid: false }), { status: 200 });
    }
    // Mark as used
    const id = data[0].id;
    await fetch(`${Deno.env.get("SUPABASE_URL")}/rest/v1/admin_logins?id=eq.${id}`, {
      method: "PATCH",
      headers: {
        "apikey": Deno.env.get("SUPABASE_ANON_KEY") || "",
        "Authorization": `Bearer ${Deno.env.get("SUPABASE_ANON_KEY") || ""}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ used: true, used_at: new Date().toISOString() })
    });
    return new Response(JSON.stringify({ valid: true }), { status: 200 });
  }

  return new Response("Not found", { status: 404 });
});
