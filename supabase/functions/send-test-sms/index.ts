import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface TestSMSRequest {
  accountNumber: string;
  accountName: string;
  smsNumber: string;
  message: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { accountNumber, accountName, smsNumber, message }: TestSMSRequest = await req.json()

    // ClickSend API configuration
    const clicksendUsername = Deno.env.get('CLICKSEND_USER_ID') || Deno.env.get('CLICKSEND_USERNAME')
    const clicksendApiKey = Deno.env.get('CLICKSEND_KEY') || Deno.env.get('CLICKSEND_API_KEY')
    
    if (!clicksendUsername || !clicksendApiKey) {
      throw new Error('ClickSend credentials not configured')
    }

    console.log('Using ClickSend credentials:', { username: clicksendUsername ? 'FOUND' : 'MISSING', apiKey: clicksendApiKey ? 'FOUND' : 'MISSING' })

    // ClickSend API payload
    const smsPayload = {
      messages: [
        {
          source: "sdk",
          to: smsNumber,
          body: message,
          from: "MusicSupplies"
        }
      ]
    }

    // Create Basic Auth header
    const credentials = btoa(`${clicksendUsername}:${clicksendApiKey}`)
    
    // Send SMS via ClickSend API
    const clicksendResponse = await fetch('https://rest.clicksend.com/v3/sms/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${credentials}`
      },
      body: JSON.stringify(smsPayload)
    })

    const responseData = await clicksendResponse.json()

    if (!clicksendResponse.ok) {
      console.error('ClickSend API error:', responseData)
      throw new Error(`ClickSend API error: ${responseData.response_msg || 'Unknown error'}`)
    }

    console.log('Test SMS sent successfully:', responseData)

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Test SMS sent successfully',
        clicksendResponse: responseData
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      },
    )

  } catch (error) {
    console.error('Error sending test SMS:', error)
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      },
    )
  }
})

/* To deploy this function, run:
supabase functions deploy send-test-sms

Environment variables needed:
supabase secrets set CLICKSEND_USER_ID=your_username
supabase secrets set CLICKSEND_KEY=your_api_key
*/
