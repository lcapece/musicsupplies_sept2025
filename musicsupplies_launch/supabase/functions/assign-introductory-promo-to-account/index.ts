import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

console.log("assign-introductory-promo-to-account function started");

serve(async (req) => {
  // This is needed if you're planning to invoke your function from a browser.
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

    // 1. Find the active introductory promotion
    const { data: promoData, error: promoError } = await supabaseAdmin
      .from('discount_tiers')
      .select('id, max_orders')
      .eq('discount_type', 'introductory_percentage_first_n_orders')
      .eq('is_active', true)
      .order('created_at', { ascending: false }) // Get the latest one if multiple exist
      .limit(1)
      .single();

    if (promoError || !promoData) {
      console.error("Error fetching introductory promo or promo not found:", promoError);
      throw new Error("Active introductory promotion not found or error fetching it.");
    }

    const introPromoId = promoData.id;
    const maxUses = promoData.max_orders || 3; // Default to 3 if max_orders is null

    // 2. Update the account with the promo details
    const { data: accountUpdateData, error: accountUpdateError } = await supabaseAdmin
      .from('accounts')
      .update({
        intro_promo_id: introPromoId,
        intro_promo_uses_remaining: maxUses,
      })
      .eq('id', account_id) // Assuming 'id' is the primary key for accounts table
      .select()
      .single();

    if (accountUpdateError) {
      console.error("Error updating account with promo:", accountUpdateError);
      throw new Error("Failed to assign introductory promo to account.");
    }

    if (!accountUpdateData) {
      throw new Error(`Account with id ${account_id} not found or failed to update.`);
    }

    return new Response(
      JSON.stringify({
        message: `Successfully assigned introductory promo (ID: ${introPromoId}, Uses: ${maxUses}) to account ${account_id}.`,
        account: accountUpdateData,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    console.error("Error in assign-introductory-promo-to-account function:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});
