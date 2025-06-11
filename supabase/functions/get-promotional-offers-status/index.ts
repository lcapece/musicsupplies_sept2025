import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

console.log("get-promotional-offers-status function started");

interface AppliedOrderInfo {
  order_number: string; // WB + number
  order_date: string; // YYYY-MM-DD
  invoice_amount: number;
  savings_amount: number;
}

interface PromoStatus {
  introductoryPromo: {
    name: string;
    description: string;
    value: number;
    uses_remaining: number | null;
    max_uses: number | null;
    orders_applied: AppliedOrderInfo[];
    is_active_for_user: boolean;
  } | null;
  everydayDiscount: {
    name: string;
    description: string;
    value: number; // percentage
  } | null;
}

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

    if (!account_id || typeof account_id !== 'number') {
      throw new Error("account_id (number) is required.");
    }

    let responsePayload: PromoStatus = {
      introductoryPromo: null,
      everydayDiscount: null, // Placeholder for now
    };

    // 1. Fetch account's introductory promo status
    const { data: accountData, error: accountErr } = await supabaseAdmin
      .from('accounts')
      .select('intro_promo_id, intro_promo_uses_remaining')
      .eq('id', account_id)
      .single();

    if (accountErr) throw accountErr;

    if (accountData && accountData.intro_promo_id) {
      const { data: promoDetails, error: promoErr } = await supabaseAdmin
        .from('discount_tiers')
        .select('id, name, description, value, max_orders, is_active')
        .eq('id', accountData.intro_promo_id)
        .single();

      if (promoErr) throw promoErr;

      if (promoDetails && promoDetails.is_active) {
        const ordersApplied: AppliedOrderInfo[] = [];
        // Fetch orders where this promo was applied
        // This requires knowing how the promo application is marked on an order.
        // Assuming discount name/partnumber is in order_items or order_comments.
        // Let's search for the promo name in order_comments for simplicity.
        
        const promoIdentifier = promoDetails.name || `INTRO-${promoDetails.value}P`;

        const { data: ordersData, error: ordersErr } = await supabaseAdmin
          .from('web_orders')
          .select('order_number, created_at, grand_total, discount_amount, order_comments, order_items')
          .eq('account_number', account_id)
          // We need a reliable way to link orders to this specific promo.
          // Option 1: Check order_comments (less reliable if format changes)
          // .like('order_comments', `%${promoIdentifier}%`) 
          // Option 2: Check if a specific discount part number is in order_items
          // This requires knowing the exact part number used for the intro promo discount line item.
          // Let's assume the discount line item's partnumber is the promoDetails.name or a generated one.
          .order('created_at', { ascending: false });
        
        if (ordersErr) throw ordersErr;

        if (ordersData) {
          for (const order of ordersData) {
            // Check if this order used the introductory promo
            // This check needs to be robust. For now, let's assume if discount_amount > 0 and it matches the expected rate.
            // A more robust way is to check if the specific discount part number for the intro promo is in order.order_items
            let introPromoLineItemFound = false;
            if (order.order_items && Array.isArray(order.order_items)) {
                for (const item of order.order_items) {
                    if (item.partnumber === promoIdentifier || (item.description && item.description.includes(promoDetails.description || "Introductory"))) {
                        introPromoLineItemFound = true;
                        // Assuming the discount_amount on the order is primarily from this promo if found
                        ordersApplied.push({
                            order_number: `WB${order.order_number}`,
                            order_date: new Date(order.created_at).toISOString().split('T')[0],
                            invoice_amount: order.grand_total + order.discount_amount, // Reconstruct pre-discount total
                            savings_amount: order.discount_amount,
                        });
                        break; 
                    }
                }
            }
            // Limit to max_orders if more are found due to loose matching
            if (ordersApplied.length >= (promoDetails.max_orders || 3)) break;
          }
        }

        responsePayload.introductoryPromo = {
          name: promoDetails.name || 'Introductory Offer',
          description: promoDetails.description || `${promoDetails.value}% off first orders`,
          value: promoDetails.value,
          uses_remaining: accountData.intro_promo_uses_remaining,
          max_uses: promoDetails.max_orders,
          orders_applied: ordersApplied.slice(0, (promoDetails.max_orders || 3) - (accountData.intro_promo_uses_remaining || 0) ), // Show only used ones
          is_active_for_user: (accountData.intro_promo_uses_remaining || 0) > 0,
        };
      }
    }
    
    // Fetch "1% off everyday orders" - This needs clarification on how it's stored/identified
    // For now, let's assume there's a general discount tier for it.
    const { data: everydayDiscountData, error: everydayErr } = await supabaseAdmin
        .from('discount_tiers') // Or 'lcmd_discount' if it's from there
        .select('name, description, value')
        .eq('name', 'Standard Account Discount') // Example name, adjust as needed
        .eq('is_active', true)
        .limit(1)
        .single();

    if (everydayErr && everydayErr.code !== 'PGRST116') { /* PGRST116: no rows found */ console.error("Error fetching everyday discount:", everydayErr); }
    
    if (everydayDiscountData) {
        responsePayload.everydayDiscount = {
            name: everydayDiscountData.name,
            description: everydayDiscountData.description || `${everydayDiscountData.value}% off all orders`,
            value: everydayDiscountData.value,
        };
    }


    return new Response(JSON.stringify(responsePayload), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    console.error("Error in get-promotional-offers-status function:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});
