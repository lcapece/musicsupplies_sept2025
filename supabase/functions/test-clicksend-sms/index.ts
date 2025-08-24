import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders } from "../_shared/cors.ts";

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Skip JWT verification for testing
    console.log("Test ClickSend SMS function called");
    // Get ClickSend credentials from Edge secrets
    const CLICKSEND_USERNAME = Deno.env.get("CLICKSEND_USERID");
    const CLICKSEND_API_KEY = Deno.env.get("CLICKSEND_API_KEY");

    if (!CLICKSEND_USERNAME || !CLICKSEND_API_KEY) {
      throw new Error("ClickSend credentials not found in Edge secrets");
    }

    // Parse request body
    const { phone_number, message } = await req.json();

    if (!phone_number || !message) {
      throw new Error("Missing required fields: phone_number and message");
    }

    // Prepare ClickSend API request
    const clicksendPayload = {
      messages: [
        {
          source: "typescript",
          body: message,
          to: phone_number,
          custom_string: "test-sms"
        }
      ]
    };

    console.log("Sending SMS to:", phone_number);
    console.log("Message:", message);

    // Send SMS via ClickSend
    const clicksendResponse = await fetch("https://rest.clicksend.com/v3/sms/send", {
      method: "POST",
      headers: {
        "Authorization": `Basic ${btoa(`${CLICKSEND_USERNAME}:${CLICKSEND_API_KEY}`)}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(clicksendPayload)
    });

    const clicksendResult = await clicksendResponse.json();
    console.log("ClickSend response:", JSON.stringify(clicksendResult, null, 2));

    if (!clicksendResponse.ok) {
      throw new Error(`ClickSend API error: ${clicksendResult.response_msg || 'Unknown error'}`);
    }

    // Check if SMS was sent successfully
    if (clicksendResult.data?.messages?.[0]?.status === "SUCCESS") {
      return new Response(
        JSON.stringify({
          success: true,
          message: "SMS sent successfully",
          details: clicksendResult.data.messages[0]
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200
        }
      );
    } else {
      throw new Error(`SMS send failed: ${clicksendResult.data?.messages?.[0]?.status || 'Unknown status'}`);
    }

  } catch (error) {
    console.error("Error in test-clicksend-sms:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400
      }
    );
  }
});
