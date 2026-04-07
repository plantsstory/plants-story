import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import Stripe from "https://esm.sh/stripe@14?target=deno";

// No CORS needed for webhooks (Stripe server-to-server)

serve(async (req: Request) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  try {
    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, {
      apiVersion: "2023-10-16",
    });

    // 1. Verify webhook signature
    const body = await req.text();
    const signature = req.headers.get("stripe-signature");
    if (!signature) {
      return new Response("No signature", { status: 400 });
    }

    const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SIGNING_SECRET")!;
    let event: Stripe.Event;
    try {
      // Stripe SDK on Deno uses async constructEventAsync
      event = await stripe.webhooks.constructEventAsync(
        body,
        signature,
        webhookSecret
      );
    } catch (err) {
      console.error("Webhook signature verification failed:", err.message);
      return new Response("Webhook signature verification failed", { status: 400 });
    }

    // 2. Initialize Supabase with service_role (bypasses RLS)
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // 3. Handle events
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        if (session.mode !== "subscription") break;

        const userId = session.metadata?.supabase_user_id;
        const subscriptionId = session.subscription as string;
        const customerId = session.customer as string;

        if (!userId) {
          console.error("No supabase_user_id in checkout session metadata");
          await supabase.from("stripe_webhook_errors").insert({
            event_id: event.id,
            event_type: event.type,
            error_message: "No supabase_user_id in checkout session metadata",
            error_details: { session_id: session.id },
          });
          break;
        }

        // Fetch subscription details from Stripe
        const subscription = await stripe.subscriptions.retrieve(subscriptionId);
        const priceId = subscription.items.data[0]?.price.id;
        const plan = priceId === Deno.env.get("STRIPE_PRICE_ANNUAL")
          ? "seedling_annual"
          : "seedling_monthly";

        await supabase.from("subscriptions").upsert({
          user_id: userId,
          stripe_customer_id: customerId,
          stripe_subscription_id: subscriptionId,
          plan: plan,
          status: subscription.status === "active" ? "active" : "trialing",
          current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
          current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
          cancel_at_period_end: subscription.cancel_at_period_end,
          updated_at: new Date().toISOString(),
        }, { onConflict: "user_id" });

        console.log(`Subscription created for user ${userId}: ${plan}`);
        break;
      }

      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription;
        const customerId = subscription.customer as string;

        // Find user by stripe_customer_id
        const { data: profile } = await supabase
          .from("profiles")
          .select("id")
          .eq("stripe_customer_id", customerId)
          .single();

        if (!profile) {
          console.error("No profile found for customer:", customerId);
          await supabase.from("stripe_webhook_errors").insert({
            event_id: event.id,
            event_type: event.type,
            error_message: "No profile found for customer",
            error_details: { customer_id: customerId },
          });
          break;
        }

        const priceId = subscription.items.data[0]?.price.id;
        const plan = priceId === Deno.env.get("STRIPE_PRICE_ANNUAL")
          ? "seedling_annual"
          : "seedling_monthly";

        // Map Stripe status to our status
        let status = "inactive";
        if (subscription.status === "active") status = "active";
        else if (subscription.status === "trialing") status = "trialing";
        else if (subscription.status === "past_due") status = "past_due";
        else if (subscription.status === "canceled" || subscription.status === "unpaid") status = "canceled";

        await supabase.from("subscriptions").upsert({
          user_id: profile.id,
          stripe_customer_id: customerId,
          stripe_subscription_id: subscription.id,
          plan: plan,
          status: status,
          current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
          current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
          cancel_at_period_end: subscription.cancel_at_period_end,
          updated_at: new Date().toISOString(),
        }, { onConflict: "user_id" });

        console.log(`Subscription updated for user ${profile.id}: ${status}`);
        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        const customerId = subscription.customer as string;

        const { data: profile3 } = await supabase
          .from("profiles")
          .select("id")
          .eq("stripe_customer_id", customerId)
          .single();

        if (profile3) {
          await supabase.from("subscriptions").update({
            status: "canceled",
            cancel_at_period_end: false,
            updated_at: new Date().toISOString(),
          }).eq("user_id", profile3.id);

          console.log(`Subscription canceled for user ${profile3.id}`);
        } else {
          await supabase.from("stripe_webhook_errors").insert({
            event_id: event.id,
            event_type: event.type,
            error_message: "No profile found for customer on subscription.deleted",
            error_details: { customer_id: customerId },
          });
        }
        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        const customerId = invoice.customer as string;

        const { data: profile4 } = await supabase
          .from("profiles")
          .select("id")
          .eq("stripe_customer_id", customerId)
          .single();

        if (profile4) {
          await supabase.from("subscriptions").update({
            status: "past_due",
            updated_at: new Date().toISOString(),
          }).eq("user_id", profile4.id);

          console.log(`Payment failed for user ${profile4.id}`);
        } else {
          await supabase.from("stripe_webhook_errors").insert({
            event_id: event.id,
            event_type: event.type,
            error_message: "No profile found for customer on payment_failed",
            error_details: { customer_id: customerId },
          });
        }
        break;
      }

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Webhook error:", err);
    // Best-effort error logging (supabase may not be initialized if error was early)
    try {
      const supabaseForLog = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
      );
      await supabaseForLog.from("stripe_webhook_errors").insert({
        event_id: "unknown",
        event_type: "unknown",
        error_message: err.message || String(err),
        error_details: { stack: err.stack },
      });
    } catch { /* ignore logging failure */ }
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});
