import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { payjpRequest, mapPayjpSubscription } from "../_shared/payjp.ts";

// PAY.JP webhooks are not signed. Two defenses:
// 1. Shared secret in the URL (?token=...) matching PAYJP_WEBHOOK_TOKEN
// 2. Never trust the payload: re-fetch the object from the PAY.JP API by id
//    and sync DB state from the fetched (authoritative) object.

async function sendErrorAlert(subject: string, details: string) {
  const resendKey = Deno.env.get("RESEND_API_KEY");
  const alertEmail = Deno.env.get("ALERT_EMAIL") || "admin@plantsstory.com";
  if (!resendKey) return;
  try {
    await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${resendKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: "Aroid Origins <noreply@plantsstory.com>",
        to: [alertEmail],
        subject: `[PAY.JP Webhook Alert] ${subject}`,
        text: `PAY.JP webhook error detected:\n\n${details}\n\nTimestamp: ${new Date().toISOString()}`,
      }),
    });
  } catch { /* best-effort alert */ }
}

serve(async (req: Request) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  // 1. Verify shared secret in URL
  const url = new URL(req.url);
  const expected = Deno.env.get("PAYJP_WEBHOOK_TOKEN");
  if (!expected || url.searchParams.get("token") !== expected) {
    return new Response("Unauthorized", { status: 401 });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  async function logError(eventId: string, eventType: string, msg: string, details: unknown) {
    console.error(msg, details);
    await supabase.from("stripe_webhook_errors").insert({
      event_id: eventId,
      event_type: `payjp:${eventType}`,
      error_message: msg,
      error_details: details,
    });
    await sendErrorAlert(msg, `Event: ${eventType}\nDetails: ${JSON.stringify(details)}`);
  }

  try {
    const event = await req.json();
    const eventType: string = event.type || "unknown";
    const eventId: string = event.id || "unknown";
    const obj = event.data || {};

    // Resolve the affected subscription id from the payload
    let subscriptionId: string | null = null;
    if (obj.object === "subscription") {
      subscriptionId = obj.id;
    } else if (obj.object === "charge" && obj.subscription) {
      subscriptionId = obj.subscription;
    }

    if (!subscriptionId) {
      console.log(`Ignoring event without subscription: ${eventType}`);
      return jsonOk();
    }

    // 2. Re-fetch the subscription from PAY.JP (authoritative state)
    const fetched = await payjpRequest("GET", `/subscriptions/${subscriptionId}`);
    if (!fetched.ok) {
      // Deleted subscriptions can no longer be fetched: mark canceled
      if (fetched.error?.status === 404 || fetched.error?.code === "invalid_id") {
        const { data: row } = await supabase
          .from("subscriptions")
          .select("user_id")
          .eq("payjp_subscription_id", subscriptionId)
          .single();
        if (row) {
          await supabase.from("subscriptions").update({
            status: "canceled",
            cancel_at_period_end: false,
            updated_at: new Date().toISOString(),
          }).eq("user_id", row.user_id);
          console.log(`Subscription deleted for user ${row.user_id}`);
        }
        return jsonOk();
      }
      await logError(eventId, eventType, "Failed to fetch subscription from PAY.JP", {
        subscription_id: subscriptionId,
        error: fetched.error,
      });
      return jsonOk();
    }

    const sub = fetched.data;
    const mapped = mapPayjpSubscription(sub);

    // 3. Find the user: by subscription id, then by customer id
    let userId: string | null = null;
    const { data: bySub } = await supabase
      .from("subscriptions")
      .select("user_id")
      .eq("payjp_subscription_id", subscriptionId)
      .single();
    if (bySub) {
      userId = bySub.user_id;
    } else {
      const { data: byCustomer } = await supabase
        .from("profiles")
        .select("id")
        .eq("payjp_customer_id", sub.customer)
        .single();
      if (byCustomer) userId = byCustomer.id;
    }

    if (!userId) {
      await logError(eventId, eventType, "No user found for PAY.JP subscription", {
        subscription_id: subscriptionId,
        customer_id: sub.customer,
      });
      return jsonOk();
    }

    // 4. Sync DB from the fetched subscription
    await supabase.from("subscriptions").upsert({
      user_id: userId,
      payjp_customer_id: sub.customer,
      payjp_subscription_id: sub.id,
      plan: mapped.plan,
      status: mapped.status,
      current_period_start: mapped.current_period_start,
      current_period_end: mapped.current_period_end,
      cancel_at_period_end: mapped.cancel_at_period_end,
      updated_at: new Date().toISOString(),
    }, { onConflict: "user_id" });

    console.log(`Synced subscription for user ${userId}: ${mapped.status} (event ${eventType})`);
    return jsonOk();
  } catch (err) {
    console.error("payjp-webhook error:", err);
    try {
      await supabase.from("stripe_webhook_errors").insert({
        event_id: "unknown",
        event_type: "payjp:unknown",
        error_message: err.message || String(err),
        error_details: { stack: err.stack },
      });
    } catch { /* ignore logging failure */ }
    await sendErrorAlert("Unhandled webhook error", err.message || String(err));
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});

function jsonOk() {
  return new Response(JSON.stringify({ received: true }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}
