import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*', // Allow requests from any origin
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS', // Explicitly allow POST and OPTIONS
};

interface RequestBody {
  phoneNumber: string;
  accountNumber: number;
}

serve(async (req: Request) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Initialize Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
    );

    // Log function invocation
    console.log('Function invoked with request:', req.method, req.url);
    
    // Get and log request body
    const requestBody = await req.json();
    console.log('Raw request body:', JSON.stringify(requestBody));
    
    const { phoneNumber, accountNumber: rawAccountNumber }: RequestBody = requestBody;
    
    // Convert accountNumber to a number (bigint in the database)
    const accountNumber = typeof rawAccountNumber === 'string' ? parseInt(rawAccountNumber, 10) : rawAccountNumber;
    
    console.log('Parsed request params:', { 
      phoneNumber, 
      rawAccountNumber, 
      accountNumber, 
      rawType: typeof rawAccountNumber, 
      convertedType: typeof accountNumber 
    });

    if (!phoneNumber || !accountNumber) {
      return new Response(
        JSON.stringify({ error: 'Phone number and account number are required' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Format phone number (ensure it starts with + for international, or 1 for US/Canada if no +)
    let formattedPhone = phoneNumber.replace(/\D/g, ''); // Remove non-digits
    if (formattedPhone.length === 10 && !formattedPhone.startsWith('1')) { // US/Canada without country code
      formattedPhone = '+1' + formattedPhone;
    } else if (formattedPhone.length === 11 && formattedPhone.startsWith('1')) { // US/Canada with 1
      formattedPhone = '+' + formattedPhone;
    } else if (!formattedPhone.startsWith('+')) { // Other numbers, assume country code is present or add +
      formattedPhone = '+' + formattedPhone;
    }
    
    // Generate 6-digit verification code
    const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();

    // Store verification code in database with expiration (5 minutes)
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString();
    console.log('Preparing database operation with data:', {
      account_number: accountNumber,
      account_number_type: typeof accountNumber,
      phone_number: formattedPhone,
      verification_code: verificationCode,
      expires_at: expiresAt
    });
    
    // Define dbError variable
    let dbError = null;
    
    try {
      console.log('Starting database operation...');
      const { error } = await supabaseClient
      .from('sms_verification_codes')
      .upsert({
        account_number: Number(accountNumber), // Ensure it's a number for the bigint column
        phone_number: formattedPhone,
        verification_code: verificationCode,
        expires_at: expiresAt,
        verified: false,
        created_at: new Date().toISOString()
      }, {
        onConflict: 'account_number' // Corrected to match the table's unique constraint
      });
      
      // Assign the error
      dbError = error;
      console.log('Database operation completed without throwing exception, error:', dbError);
    } catch (err) {
      console.error('Exception during database operation:', err);
      return new Response(
        JSON.stringify({ 
          error: 'Exception during database operation', 
          details: err.message,
          stack: err.stack
        }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    if (dbError) {
      // More detailed error logging
      console.error('Database error details:', {
        message: dbError.message,
        details: dbError.details,
        hint: dbError.hint,
        code: dbError.code,
        fullError: JSON.stringify(dbError)
      });
      
      return new Response(
        JSON.stringify({ 
          error: 'Failed to store verification code', 
          details: dbError.message,
          code: dbError.code,
          fullError: JSON.stringify(dbError)
        }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Send SMS using ClickSend
    const clicksendUsername = Deno.env.get('CLICKSEND_USERNAME');
    const clicksendApiKey = Deno.env.get('CLICKSEND_API_KEY');

    if (!clicksendUsername || !clicksendApiKey) {
      console.error('ClickSend configuration missing');
      return new Response(
        JSON.stringify({ error: 'ClickSend configuration missing' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    const messageBody = `Your Music Supplies verification code is: ${verificationCode}. This code expires in 5 minutes.`;
    
    const clicksendUrl = 'https://rest.clicksend.com/v3/sms/send';
    const credentials = btoa(`${clicksendUsername}:${clicksendApiKey}`);

    const clicksendResponse = await fetch(clicksendUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${credentials}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        messages: [
          {
            source: 'sdk',
            body: messageBody,
            to: formattedPhone,
            from: 'MusicSupplies'
          },
        ],
      }),
    });

    const clicksendResponseData = await clicksendResponse.json();

    if (clicksendResponseData.http_code !== 200 || clicksendResponseData.response_code !== "SUCCESS") {
      console.error('ClickSend API error:', clicksendResponseData);
      return new Response(
        JSON.stringify({ error: 'Failed to send SMS via ClickSend', details: clicksendResponseData.response_msg }),
        { 
          status: clicksendResponseData.http_code || 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }
    
    // Check individual message status if needed (ClickSend can return an array of message statuses)
    const firstMessageStatus = clicksendResponseData.data.messages[0];
    if (firstMessageStatus.status !== "SUCCESS") {
        console.error('ClickSend message sending failed:', firstMessageStatus);
        return new Response(
            JSON.stringify({ error: 'Failed to send SMS message', details: firstMessageStatus.status_text || 'Unknown ClickSend error' }),
            { 
                status: 500, // Or map ClickSend status codes to HTTP status codes
                headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
            }
        );
    }


    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Verification code sent successfully via ClickSend',
        phoneNumber: formattedPhone 
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Function error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: error.message }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
