/// <reference types="https://deno.land/std@0.168.0/http/server.ts" />
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Function to send SMS via ClickSend API
async function sendClickSendSms(to: string, message: string) {
  const username = Deno.env.get('CLICKSEND_USERNAME');
  const apiKey = Deno.env.get('CLICKSEND_API_KEY');

  if (!username || !apiKey) {
    throw new Error('ClickSend API credentials not set in environment variables.');
  }

  const auth = btoa(`${username}:${apiKey}`);
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
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('Supabase configuration not found');
  }

  const response = await fetch(`${supabaseUrl}/rest/v1/sms_notification_settings?event_name=eq.${eventName}&is_enabled=eq.true&select=notification_phones`, {
    headers: {
      'Authorization': `Bearer ${serviceRoleKey}`,
      'apikey': serviceRoleKey,
      'Content-Type': 'application/json'
    }
  });

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

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { eventName, message, customPhones, additionalData } = await req.json();

    if (!eventName || !message) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: eventName and message are required' }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400
        }
      );
    }

    // Get phone numbers - either custom phones for adhoc SMS or admin phones for events
    let adminPhones: string[] = [];
    
    if (customPhones && Array.isArray(customPhones) && customPhones.length > 0) {
      // Use custom phones for adhoc SMS
      adminPhones = customPhones;
    } else {
      // Get admin phone numbers for this event from database
      adminPhones = await getAdminPhoneNumbers(eventName);
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

    // Send SMS to all admin phone numbers
    const smsPromises = adminPhones.map(async (phone: string) => {
      try {
        const smsResponse = await sendClickSendSms(phone, message);
        return {
          phone,
          success: true,
          messageId: smsResponse.data?.messages?.[0]?.message_id
        };
      } catch (error) {
        console.error(`Failed to send SMS to ${phone}:`, error.message);
        return {
          phone,
          success: false,
          error: error.message
        };
      }
    });

    const results = await Promise.all(smsPromises);
    const successCount = results.filter(r => r.success).length;
    const failureCount = results.filter(r => !r.success).length;

    console.log('Admin SMS sent:', {
      eventName,
      totalPhones: adminPhones.length,
      successCount,
      failureCount,
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
    console.error('Error in send-admin-sms Edge Function:', error.message);
    return new Response(JSON.stringify({ 
      error: error.message,
      success: false 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500
    });
  }
});
