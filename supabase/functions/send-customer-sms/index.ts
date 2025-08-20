/// <reference types="https://deno.land/std@0.168.0/http/server.ts" />
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Function to send SMS via ClickSend API
async function sendClickSendSms(to: string, message: string) {
  // EMERGENCY HARDCODED CREDENTIALS FOR IMMEDIATE DEPLOYMENT
  const username = 'lcapece@optonline.net';
  const apiKey = '831F409D-D014-C9FE-A453-56538DDA7802';

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

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { customerPhone, orderNumber, customerName } = await req.json();

    if (!customerPhone || !orderNumber) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: customerPhone and orderNumber are required' }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400
        }
      );
    }

    // Construct the customer SMS message
    const smsMessage = `From MusicSupplies.com: Thank you for your order${customerName ? `, ${customerName}` : ''}! Your order #${orderNumber} has been received. You will receive another SMS with the grand total (including shipping fees) and UPS tracking number once your order is processed and shipped. - Lou Capece Music Distributors`;

    // Send the SMS to customer
    const smsResponse = await sendClickSendSms(customerPhone, smsMessage);

    console.log('Customer SMS sent successfully:', {
      to: customerPhone,
      orderNumber,
      messageId: smsResponse.data?.messages?.[0]?.message_id
    });

    return new Response(JSON.stringify({ 
      success: true, 
      message: 'Customer SMS sent successfully',
      messageId: smsResponse.data?.messages?.[0]?.message_id 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200
    });

  } catch (error) {
    console.error('Error in send-customer-sms Edge Function:', error.message);
    return new Response(JSON.stringify({ 
      error: error.message,
      success: false 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500
    });
  }
});
