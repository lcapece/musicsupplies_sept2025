import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface EmailRequest {
  to: string;
  subject: string;
  text: string;
  html?: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { to, subject, text, html }: EmailRequest = await req.json()

    // Validate required fields
    if (!to || !subject || !text) {
      return new Response(
        JSON.stringify({ 
          error: 'Missing required fields: to, subject, and text are required' 
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Get Mailgun credentials from environment/vault
    const MAILGUN_API_KEY = Deno.env.get('MAILGUN_API_KEY')
    const MAILGUN_DOMAIN = Deno.env.get('MAILGUN_DOMAIN') || 'mg.musicsupplies.com'
    const MAILGUN_SENDING_KEY = Deno.env.get('MAILGUN_SENDING_KEY')
    
    if (!MAILGUN_API_KEY || !MAILGUN_SENDING_KEY) {
      console.error('Missing Mailgun configuration:', {
        hasApiKey: !!MAILGUN_API_KEY,
        hasSendingKey: !!MAILGUN_SENDING_KEY,
        domain: MAILGUN_DOMAIN
      })
      
      return new Response(
        JSON.stringify({ 
          error: 'Mailgun configuration is incomplete. Missing API key or sending key.' 
        }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Prepare form data for Mailgun API
    const formData = new FormData()
    formData.append('from', `Music Supplies <marketing@${MAILGUN_DOMAIN}>`)
    formData.append('to', to)
    formData.append('subject', subject)
    formData.append('text', text)
    
    if (html) {
      formData.append('html', html)
    }

    // Add tracking and other options
    formData.append('o:tracking', 'true')
    formData.append('o:tracking-clicks', 'true')
    formData.append('o:tracking-opens', 'true')

    // Send email via Mailgun API
    const mailgunUrl = `https://api.mailgun.net/v3/${MAILGUN_DOMAIN}/messages`
    
    console.log('Sending email via Mailgun:', {
      to,
      subject,
      domain: MAILGUN_DOMAIN,
      hasHtml: !!html
    })

    const response = await fetch(mailgunUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${btoa(`api:${MAILGUN_API_KEY}`)}`,
      },
      body: formData,
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('Mailgun API error:', {
        status: response.status,
        statusText: response.statusText,
        error: errorText
      })
      
      return new Response(
        JSON.stringify({ 
          error: `Mailgun API error: ${response.status} - ${errorText}` 
        }),
        { 
          status: response.status, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    const result = await response.json()
    
    console.log('Email sent successfully:', {
      messageId: result.id,
      to,
      subject
    })

    return new Response(
      JSON.stringify({ 
        success: true, 
        messageId: result.id,
        message: 'Email sent successfully' 
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('Error in send-mailgun-email function:', error)
    
    return new Response(
      JSON.stringify({ 
        error: `Internal server error: ${error instanceof Error ? error.message : 'Unknown error'}` 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})
