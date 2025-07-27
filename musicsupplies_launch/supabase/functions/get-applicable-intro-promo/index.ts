import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

console.log("get-applicable-intro-promo function started");

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const { account_id } = await req.json();

    if (!account_id) {
      throw new Error("account_id is required.");
    }

    // 1. Fetch account's introductory promo status
    const { data: accountData, error: accountError } = await supabaseAdmin
      .from('accounts')
      .select('intro_promo_id, intro_promo_uses_remaining')
      .eq('id', account_id) // Assuming 'id' is the PK for accounts
      .single();

    if (accountError) {
      console.error("Error fetching account promo data:", accountError);
      throw new Error("Failed to fetch account promo data.");
    }

    if (!accountData || !accountData.intro_promo_id || (accountData.intro_promo_uses_remaining !== null && accountData.intro_promo_uses_remaining <= 0)) {
      return new Response(
        JSON.stringify({ applicable_promo: null, message: "No active introductory promo for this account or uses exhausted." }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        }
      );
    }

    // 2. Fetch details of the introductory promo
    const { data: promoDetails, error: promoDetailsError } = await supabaseAdmin
      .from('discount_tiers')
      .select('id, name, description, discount_type, value, max_orders, is_active')
      .eq('id', accountData.intro_promo_id)
      .eq('is_active', true) // Ensure the promo itself is still active globally
      .single();

    if (promoDetailsError || !promoDetails) {
      console.error("Error fetching promo details or promo not active:", promoDetailsError);
      return new Response(
        JSON.stringify({ applicable_promo: null, message: "Introductory promo details not found or promo is inactive." }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        }
      );
    }
    
    const responsePayload = {
        applicable_promo: {
            ...promoDetails,
            uses_remaining: accountData.intro_promo_uses_remaining
        },
        message: "Applicable introductory promo found."
    };

    return new Response(
      JSON.stringify(responsePayload),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );

  } catch (error) {
    console.error("Error in get-applicable-intro-promo function:", error);
    return new Response(JSON.stringify({ error: error.message, applicable_promo: null }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});
