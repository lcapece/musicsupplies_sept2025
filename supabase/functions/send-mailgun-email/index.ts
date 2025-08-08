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
  attachments?: Array<{
    filename: string;
    content: string; // base64 encoded content
    contentType?: string;
  }>;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { to, subject, text, html, attachments }: EmailRequest = await req.json()

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

    // Try multiple possible secret names
    const MAILGUN_API_KEY = 
      Deno.env.get('MAILGUN_SENDING_KEY') || 
      Deno.env.get('MAILGUN_API_KEY')
      
    // Get domain, but validate it's actually a domain and not another API key
    let MAILGUN_DOMAIN = Deno.env.get('MAILGUN_DOMAIN') || 'mg.musicsupplies.com'
    
    // Check if MAILGUN_DOMAIN looks like an API key (contains many alphanumeric characters)
    if (MAILGUN_DOMAIN && MAILGUN_DOMAIN.length > 30 && !MAILGUN_DOMAIN.includes('.')) {
      console.warn('MAILGUN_DOMAIN appears to be an API key, not a domain. Using default domain.')
      MAILGUN_DOMAIN = 'mg.musicsupplies.com'
    }
    
    if (!MAILGUN_API_KEY) {
      console.error('Missing Mailgun API key in environment variables')
      
      return new Response(
        JSON.stringify({ 
          error: 'Mailgun configuration is incomplete. Missing API key.'
        }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Log configuration (without exposing full key)
    console.log('Mailgun configuration:', {
      hasApiKey: true,
      keyPrefix: MAILGUN_API_KEY.substring(0, 8) + '...',
      keyLength: MAILGUN_API_KEY.length,
      domain: MAILGUN_DOMAIN
    })

    // Prepare form data for Mailgun API
    const formData = new FormData()
    formData.append('from', `Music Supplies <noreply@${MAILGUN_DOMAIN}>`)
    formData.append('to', to)
    formData.append('subject', subject)
    formData.append('text', text)
    
    if (html) {
      formData.append('html', html)
    }

    // Handle PDF attachments
    if (attachments && attachments.length > 0) {
      console.log('Adding attachments:', attachments.length)
      attachments.forEach((attachment, index) => {
        try {
          // Convert base64 to blob for Mailgun
          const base64Content = attachment.content.replace(/^data:[^;]+;base64,/, '')
          const binaryContent = atob(base64Content)
          const uint8Array = new Uint8Array(binaryContent.length)
          for (let i = 0; i < binaryContent.length; i++) {
            uint8Array[i] = binaryContent.charCodeAt(i)
          }
          const blob = new Blob([uint8Array], { 
            type: attachment.contentType || 'application/pdf' 
          })
          
          formData.append('attachment', blob, attachment.filename)
          console.log(`Attached file: ${attachment.filename} (${blob.size} bytes)`)
        } catch (error) {
          console.error(`Error processing attachment ${index}:`, error)
        }
      })
    }

    // Disable click tracking to prevent broken redirect links
    formData.append('o:tracking', 'false')
    formData.append('o:tracking-clicks', 'false')
    formData.append('o:tracking-opens', 'false')

    // Send email via Mailgun API
    const mailgunUrl = `https://api.mailgun.net/v3/${MAILGUN_DOMAIN}/messages`
    
    console.log('Sending email via Mailgun:', {
      to,
      subject,
      domain: MAILGUN_DOMAIN,
      url: mailgunUrl
    })

    const response = await fetch(mailgunUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${btoa(`api:${MAILGUN_API_KEY}`)}`,
      },
      body: formData,
    })

    const responseText = await response.text()
    
    if (!response.ok) {
      console.error('Mailgun API error:', {
        status: response.status,
        statusText: response.statusText,
        error: responseText
      })
      
      // Parse the error for more specific feedback
      let errorMessage = `Mailgun API error: ${response.status}`
      if (response.status === 401) {
        errorMessage = 'Mailgun authentication failed. Please check API key.'
      } else if (response.status === 404) {
        errorMessage = 'Mailgun domain not found. Please check domain configuration.'
      }
      
      return new Response(
        JSON.stringify({ 
          error: errorMessage,
          details: responseText 
        }),
        { 
          status: response.status, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    const result = JSON.parse(responseText)
    
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
