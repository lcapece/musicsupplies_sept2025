import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface OrderSMSRequest {
  accountNumber: string;
  accountName: string;
  orderNumber: string;
  totalAmount: number;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { accountNumber, accountName, orderNumber, totalAmount }: OrderSMSRequest = await req.json()

    // ClickSend API configuration
    const clicksendUsername = Deno.env.get('CLICKSEND_USERNAME')
    const clicksendApiKey = Deno.env.get('CLICKSEND_API_KEY')
    
    if (!clicksendUsername || !clicksendApiKey) {
      throw new Error('ClickSend credentials not configured')
    }

    // Create the SMS message
    const message = `New Order Alert!\nAccount: ${accountNumber} - ${accountName}\nOrder #: ${orderNumber}\nTotal: $${totalAmount.toFixed(2)}`

    // ClickSend API payload
    const smsPayload = {
      messages: [
        {
          source: "sdk",
          to: "+15164550980",
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

    console.log('SMS sent successfully:', responseData)

    return new Response(
      JSON.stringify({
        success: true,
        message: 'SMS notification sent successfully',
        clicksendResponse: responseData
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      },
    )

  } catch (error) {
    console.error('Error sending SMS:', error)
    
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
supabase functions deploy send-order-sms

Environment variables needed:
supabase secrets set CLICKSEND_USERNAME=your_username
supabase secrets set CLICKSEND_API_KEY=your_api_key
*/
