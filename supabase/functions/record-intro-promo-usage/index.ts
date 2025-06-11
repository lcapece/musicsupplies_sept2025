import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

console.log("record-intro-promo-usage function started");

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const { account_id, order_id } = await req.json();

    if (!account_id) {
      throw new Error("account_id is required.");
    }
    if (!order_id) {
      // order_id might not be strictly necessary for this logic if we only update based on account state,
      // but it's good for context/logging if this function were to do more.
      console.warn("order_id was not provided, proceeding with account update only.");
    }

    // Fetch current promo status for the account
    const { data: accountData, error: fetchError } = await supabaseAdmin
      .from('accounts')
      .select('intro_promo_id, intro_promo_uses_remaining')
      .eq('id', account_id)
      .single();

    if (fetchError) {
      console.error("Error fetching account for promo usage update:", fetchError);
      throw new Error("Failed to fetch account details.");
    }

    if (!accountData || !accountData.intro_promo_id || accountData.intro_promo_uses_remaining === null || accountData.intro_promo_uses_remaining <= 0) {
      return new Response(
        JSON.stringify({ message: "No active introductory promo to record usage for or uses already exhausted.", account_id }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200, // Not an error, just nothing to do
        }
      );
    }

    const newUsesRemaining = accountData.intro_promo_uses_remaining - 1;
    let updatePayload: { intro_promo_uses_remaining: number; intro_promo_id?: number | null } = {
      intro_promo_uses_remaining: newUsesRemaining,
    };

    if (newUsesRemaining <= 0) {
      updatePayload.intro_promo_id = null; // Clear the promo ID as it's fully used
      updatePayload.intro_promo_uses_remaining = 0; // Ensure it doesn't go negative if somehow called again
    }

    const { data: updatedAccount, error: updateError } = await supabaseAdmin
      .from('accounts')
      .update(updatePayload)
      .eq('id', account_id)
      .select()
      .single();

    if (updateError) {
      console.error("Error updating account promo usage:", updateError);
      throw new Error("Failed to update account promo usage.");
    }

    return new Response(
      JSON.stringify({
        message: `Successfully recorded introductory promo usage for account ${account_id}. Uses remaining: ${newUsesRemaining}.`,
        account: updatedAccount,
        order_id: order_id // Include order_id in response if provided
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );

  } catch (error) {
    console.error("Error in record-intro-promo-usage function:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});
