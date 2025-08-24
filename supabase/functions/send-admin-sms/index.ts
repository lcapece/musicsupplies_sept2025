/// <reference types="https://deno.land/std@0.168.0/http/server.ts" />
import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/**
 * Safe env accessor compatible with Edge runtime and TS editors without Deno types.
 */
const getEnv = (k: string): string | undefined => (globalThis as any)?.Deno?.env?.get(k);

type ClickSendCreds = { username: string; apiKey: string };

// EMERGENCY HARDCODED CREDENTIALS FOR IMMEDIATE DEPLOYMENT
async function getClickSendCredentials(): Promise<ClickSendCreds> {
  const username = getEnv('CLICKSEND_USERNAME');
  const apiKey = getEnv('CLICKSEND_API_KEY');
  if (!username || !apiKey) {
    throw new Error('ClickSend credentials not found in environment (set CLICKSEND_USERNAME and CLICKSEND_API_KEY)');
  }
  return { username, apiKey };
}

// Function to send SMS via ClickSend API
async function sendClickSendSms(to: string, message: string, creds: ClickSendCreds) {
  const auth = btoa(`${creds.username}:${creds.apiKey}`);
  const url = 'https://rest.clicksend.com/v3/sms/send';

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Basic ${auth}`
    },
    body: JSON.stringify({
      messages: [
        {
          source: 'MusicSupplies',
          body: message,
          to: to
        }
      ]
    })
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(`ClickSend API error: ${response.status} - ${JSON.stringify(errorData)}`);
  }

  return response.json();
}

// Function to get admin phone numbers for a specific event
async function getAdminPhoneNumbers(eventName: string) {
  const supabaseUrl = getEnv('SUPABASE_URL');
  const serviceRoleKey = getEnv('SUPABASE_SERVICE_ROLE_KEY');

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('Supabase configuration not found');
  }

  // First try to get from sms_admins table (new approach)
  try {
    const response = await fetch(
      `${supabaseUrl}/rest/v1/sms_admins?is_active=eq.true&select=phone_number`,
      {
        headers: {
          'Authorization': `Bearer ${serviceRoleKey}`,
          'apikey': serviceRoleKey,
          'Content-Type': 'application/json'
        }
      }
    );

    if (response.ok) {
      const data = await response.json();
      if (Array.isArray(data) && data.length > 0) {
        return data
          .map(row => row.phone_number)
          .filter(phone => phone && typeof phone === 'string')
          .map(phone => phone.trim());
      }
    }
  } catch (err) {
    console.warn('Failed to fetch from sms_admins, trying sms_notification_settings:', err);
  }

  // Fallback to sms_notification_settings (legacy approach)
  const response = await fetch(
    `${supabaseUrl}/rest/v1/sms_notification_settings?event_name=eq.${eventName}&is_enabled=eq.true&select=notification_phones`,
    {
      headers: {
        'Authorization': `Bearer ${serviceRoleKey}`,
        'apikey': serviceRoleKey,
        'Content-Type': 'application/json'
      }
    }
  );

  if (!response.ok) {
    throw new Error(`Failed to fetch SMS settings: ${response.status}`);
  }

  const data = await response.json();

  if (data.length === 0) {
    return [];
  }

  // Return all phone numbers from notification_phones array
  return data[0].notification_phones || [];
}

// Legacy fallback: read phone numbers from public."2fa" (phonenumber column)
async function getLegacyTwoFaPhones() {
  const supabaseUrl = getEnv('SUPABASE_URL');
  const serviceRoleKey = getEnv('SUPABASE_SERVICE_ROLE_KEY');

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('Supabase configuration not found for 2FA legacy phones');
  }

  const url = new URL(`${supabaseUrl}/rest/v1/2fa`);
  url.searchParams.set('select', 'phonenumber');

  const resp = await fetch(url.toString(), {
    headers: {
      'Authorization': `Bearer ${serviceRoleKey}`,
      'apikey': serviceRoleKey,
      'Content-Type': 'application/json'
    }
  });

  if (!resp.ok) {
    throw new Error(`Failed to fetch 2FA legacy phones: ${resp.status}`);
  }

  const rows = await resp.json();
  if (!Array.isArray(rows)) return [];
  const phones = rows
    .map((r: { phonenumber?: string }) => r?.phonenumber)
    .filter((p: unknown): p is string => typeof p === 'string' && p.trim().length > 0);

  return phones;
}

// Optional: fetch latest unexpired 2FA code for an account directly from DB
async function fetchLatestTwoFactorCode(accountNumber: number) {
  const supabaseUrl = getEnv('SUPABASE_URL');
  const serviceRoleKey = getEnv('SUPABASE_SERVICE_ROLE_KEY');

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('Supabase configuration not found for two_factor_codes lookup');
  }

  // Check admin_logins table first (primary table for admin 2FA)
  const adminUrl = new URL(`${supabaseUrl}/rest/v1/admin_logins`);
  adminUrl.searchParams.set('account_number', `eq.${accountNumber}`);
  adminUrl.searchParams.set('used', 'eq.false');
  adminUrl.searchParams.set('expires_at', 'gt.' + new Date().toISOString());
  adminUrl.searchParams.set('select', 'code,expires_at,created_at');
  adminUrl.searchParams.set('order', 'created_at.desc');
  adminUrl.searchParams.set('limit', '1');

  const adminResp = await fetch(adminUrl.toString(), {
    headers: {
      'Authorization': `Bearer ${serviceRoleKey}`,
      'apikey': serviceRoleKey,
      'Content-Type': 'application/json'
    }
  });

  if (adminResp.ok) {
    const adminRows = await adminResp.json();
    if (Array.isArray(adminRows) && adminRows.length > 0) {
      const row = adminRows[0];
      return { code: row.code as string, expires_at: row.expires_at as string | null };
    }
  }

  // Fallback to tbl_2fa_codes table (legacy)
  const url = new URL(`${supabaseUrl}/rest/v1/tbl_2fa_codes`);
  url.searchParams.set('account_number', `eq.${accountNumber}`);
  url.searchParams.set('used', 'eq.false');
  url.searchParams.set('expires_at', 'gt.' + new Date().toISOString());
  url.searchParams.set('select', 'code,expires_at,created_at');
  url.searchParams.set('order', 'created_at.desc');
  url.searchParams.set('limit', '1');

  const resp = await fetch(url.toString(), {
    headers: {
      'Authorization': `Bearer ${serviceRoleKey}`,
      'apikey': serviceRoleKey,
      'Content-Type': 'application/json'
    }
  });

  if (!resp.ok) {
    throw new Error(`Failed to fetch latest 2FA code: ${resp.status}`);
  }

  const rows = await resp.json();
  if (!Array.isArray(rows) || rows.length === 0) {
    throw new Error('No 2FA code found for account');
  }

  const row = rows[0];
  return { code: row.code as string, expires_at: row.expires_at as string | null };
}

serve(async (req: Request) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const {
      eventName,
      message,
      customPhones,
      additionalData,
      // New optional fields to support 2FA flow without DB http extension
      lookupLatest2faCode,
      accountNumber
    }: {
      eventName?: string;
      message?: string;
      customPhones?: string[];
      additionalData?: Record<string, unknown>;
      lookupLatest2faCode?: boolean;
      accountNumber?: number;
    } = body || {};

    if (!eventName) {
      return new Response(
        JSON.stringify({ error: 'Missing required field: eventName' }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400
        }
      );
    }

    let finalMessage = message || '';
    if (lookupLatest2faCode) {
      if (!accountNumber) {
        return new Response(
          JSON.stringify({ error: 'accountNumber is required when lookupLatest2faCode is true' }),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 400
          }
        );
      }

      // Fetch the latest unexpired 2FA code for this account
      try {
        const latest = await fetchLatestTwoFactorCode(accountNumber);
        // Build standard 2FA message if caller did not supply a custom message
        if (!finalMessage) {
          finalMessage = `MusicSupplies.com Admin Security Code: ${latest.code} (expires in 90 seconds)`;
        }
      } catch (err) {
        console.error('Failed to fetch latest 2FA code:', (err as Error).message);
        return new Response(
          JSON.stringify({ error: `Failed to fetch latest 2FA code: ${(err as Error).message}` }),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 500
          }
        );
      }
    }

    if (!finalMessage) {
      return new Response(
        JSON.stringify({ error: 'Missing required field: message (or set lookupLatest2faCode true with accountNumber)' }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400
        }
      );
    }

    // Resolve phone numbers: prefer customPhones, otherwise admin event phones
    let adminPhones: string[] = [];
    if (Array.isArray(customPhones) && customPhones.length > 0) {
      adminPhones = customPhones;
    } else {
      adminPhones = await getAdminPhoneNumbers(eventName);
      if (adminPhones.length === 0) {
        // Fallback to legacy 2FA phone list table if event phones are not configured
        adminPhones = await getLegacyTwoFaPhones();
      }
    }

    if (adminPhones.length === 0) {
      return new Response(
        JSON.stringify({
          success: false,
          message: customPhones ? 'No custom phone numbers provided' : `No admin phone numbers configured for event: ${eventName}`
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200
        }
      );
    }

    // Send SMS to all target phone numbers
    const creds = await getClickSendCredentials();
    const smsPromises = adminPhones.map(async (phone: string) => {
      try {
        const smsResponse = await sendClickSendSms(phone, finalMessage, creds);
        return {
          phone,
          success: true,
          messageId: smsResponse.data?.messages?.[0]?.message_id
        };
      } catch (error) {
        console.error(`Failed to send SMS to ${phone}:`, (error as Error).message);
        return {
          phone,
          success: false,
          error: (error as Error).message
        };
      }
    });

    const results = await Promise.all(smsPromises);
    const successCount = results.filter(r => r.success).length;

    console.log('Admin SMS sent:', {
      eventName,
      totalPhones: adminPhones.length,
      successCount,
      failureCount: results.length - successCount,
      results
    });

    return new Response(JSON.stringify({
      success: true,
      message: `Admin SMS sent to ${successCount}/${adminPhones.length} phone numbers`,
      results,
      eventName,
      additionalData
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200
    });

  } catch (error) {
    console.error('Error in send-admin-sms Edge Function:', (error as Error).message);
    return new Response(JSON.stringify({
      error: (error as Error).message,
      success: false
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500
    });
  }
});
