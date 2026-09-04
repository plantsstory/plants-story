import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import Stripe from "https://esm.sh/stripe@14?target=deno";

const ALLOWED_ORIGINS = [
  "https://plantsstory.com",
  "https://plantsstory.github.io",
];

function getCorsHeaders(req: Request) {
  const origin = req.headers.get("origin") || "";
  const allowed = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    "Access-Control-Allow-Origin": allowed,
    "Access-Control-Allow-Headers":
      "authorization, x-client-info, apikey, content-type",
  };
}

serve(async (req: Request) => {
  const corsHeaders = getCorsHeaders(req);
  // CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // 1. Verify auth
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "No auth header" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Invalid token" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 2. Parse request body
    const { plan } = await req.json();
    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, {
      apiVersion: "2023-10-16",
    });

    const priceId = plan === "annual"
      ? Deno.env.get("STRIPE_PRICE_ANNUAL")!
      : Deno.env.get("STRIPE_PRICE_MONTHLY")!;

    // 3. Get or create Stripe customer
    const { data: profile } = await supabase
      .from("profiles")
      .select("stripe_customer_id")
      .eq("id", user.id)
      .single();

    let customerId = profile?.stripe_customer_id;

    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        metadata: { supabase_user_id: user.id },
      });
      customerId = customer.id;

      // Save stripe_customer_id to profiles
      await supabase
        .from("profiles")
        .update({ stripe_customer_id: customerId })
        .eq("id", user.id);
    }

    // 4. Redirect URLs (path-based SPA routes)
    const origin = req.headers.get("origin") || "https://plantsstory.com";
    const site = ["https://plantsstory.com", "https://plantsstory.github.io"].includes(origin) ? origin : "https://plantsstory.com";
    const base = site.endsWith("github.io") ? site + "/plants-story" : site;
    const successUrl = base + "/profile/edit?subscription=success";
    const cancelUrl = base + "/profile/edit?subscription=canceled";

    // 5. Create Checkout Session (no trial — see BOARD.md §2)
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: "subscription",
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: successUrl,
      cancel_url: cancelUrl,
      locale: "ja",
      allow_promotion_codes: false,
      metadata: { supabase_user_id: user.id },
      subscription_data: { metadata: { supabase_user_id: user.id } },
      consent_collection: { terms_of_service: "required" },
      custom_text: { terms_of_service_acceptance: { message: "[利用規約](https://plantsstory.com/terms/) と [特定商取引法に基づく表記](https://plantsstory.com/tokushoho/) に同意します。期間満了時に自動更新され、解約はプロフィール編集ページからいつでも可能です。" } },
    });

    return new Response(JSON.stringify({ url: session.url }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("create-checkout error:", err);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
