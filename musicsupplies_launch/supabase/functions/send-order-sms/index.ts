/// <reference types="https://deno.land/std@0.168.0/http/server.ts" />
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { corsHeaders } from '../_shared/cors.ts';

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
          source: 'api',
          from: 'MusicSupplies', // Or a registered ClickSend number/alphanumeric sender ID
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

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { accountNumber, accountName, orderNumber, totalAmount } = await req.json();

    // Construct the SMS message
    const smsMessage = `New Order Alert!\nAccount: ${accountNumber} - ${accountName}\nOrder #: ${orderNumber}\nTotal: $${totalAmount.toFixed(2)}`;
    const recipientPhoneNumber = '+15164550980'; // Hardcoded as per CLICKSEND_SMS_SETUP.md

    // Send the SMS
    const smsResponse = await sendClickSendSms(recipientPhoneNumber, smsMessage);

    return new Response(JSON.stringify({ message: 'SMS sent successfully', smsResponse }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200
    });
  } catch (error) {
    console.error('Error in send-order-sms Edge Function:', error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500
    });
  }
});
