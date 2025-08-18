import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

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
          to: to.startsWith('+') ? to : `+${to}`
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
    // Create Supabase client with service role for full access
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Fetch pending SMS messages from the queue
    const { data: pendingMessages, error: fetchError } = await supabase
      .from('sms_notification_queue')
      .select('*')
      .eq('status', 'pending')
      .order('created_at', { ascending: true })
      .limit(10); // Process up to 10 messages at a time

    if (fetchError) {
      throw new Error(`Failed to fetch SMS queue: ${fetchError.message}`);
    }

    if (!pendingMessages || pendingMessages.length === 0) {
      return new Response(JSON.stringify({ 
        success: true, 
        message: 'No pending SMS messages to process' 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      });
    }

    const results = [];

    // Process each pending message
    for (const message of pendingMessages) {
      try {
        // Send the SMS
        const smsResponse = await sendClickSendSms(message.phone_number, message.message);
        
        // Update the queue entry as sent
        const { error: updateError } = await supabase
          .from('sms_notification_queue')
          .update({ 
            status: 'sent',
            sent_at: new Date().toISOString()
          })
          .eq('id', message.id);

        if (updateError) {
          console.error(`Failed to update SMS queue entry ${message.id}:`, updateError);
        }

        results.push({
          id: message.id,
          success: true,
          response: smsResponse
        });

        console.log(`SMS sent successfully for ${message.event_type}:`, {
          id: message.id,
          phone: message.phone_number,
          event: message.event_type
        });

      } catch (sendError) {
        // Update the queue entry as failed
        const { error: updateError } = await supabase
          .from('sms_notification_queue')
          .update({ 
            status: 'failed',
            error_message: sendError.message
          })
          .eq('id', message.id);

        if (updateError) {
          console.error(`Failed to update SMS queue entry ${message.id} as failed:`, updateError);
        }

        results.push({
          id: message.id,
          success: false,
          error: sendError.message
        });

        console.error(`Failed to send SMS for ${message.event_type}:`, sendError);
      }
    }

    return new Response(JSON.stringify({ 
      success: true, 
      message: `Processed ${results.length} SMS messages`,
      results
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200
    });

  } catch (error) {
    console.error('Error in process-sms-queue:', error);
    return new Response(JSON.stringify({ 
      error: error.message,
      success: false 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500
    });
  }
});