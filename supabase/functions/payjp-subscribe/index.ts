import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { payjpRequest, mapPayjpSubscription } from "../_shared/payjp.ts";

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
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  try {
    // 1. Verify auth
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "No auth header" }, 401);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) return json({ error: "Invalid token" }, 401);

    if (!Deno.env.get("PAYJP_SECRET_KEY")) {
      return json({ error: "決済システムは現在準備中です" }, 503);
    }

    // 2. Parse request: card token from payjp.js + selected plan
    const { card_token, plan } = await req.json();
    if (!card_token || typeof card_token !== "string") {
      return json({ error: "カード情報が不正です" }, 400);
    }
    const planId = plan === "annual"
      ? Deno.env.get("PAYJP_PLAN_ANNUAL")!
      : Deno.env.get("PAYJP_PLAN_MONTHLY")!;

    // 3. Reject if already subscribed
    const { data: existingSub } = await supabase
      .from("subscriptions")
      .select("status, plan, current_period_end, payjp_subscription_id")
      .eq("user_id", user.id)
      .single();

    if (
      existingSub &&
      ["active", "trialing"].includes(existingSub.status) &&
      (existingSub.plan === "granted" ||
        (existingSub.current_period_end &&
          new Date(existingSub.current_period_end).getTime() > Date.now()))
    ) {
      return json({ error: "既にサブスクリプションが有効です" }, 400);
    }

    // 4. Get or create PAY.JP customer
    const { data: profile } = await supabase
      .from("profiles")
      .select("payjp_customer_id")
      .eq("id", user.id)
      .single();

    let customerId = profile?.payjp_customer_id as string | null;

    if (customerId) {
      // Register the new card as the default card
      const upd = await payjpRequest("POST", `/customers/${customerId}`, {
        card: card_token,
      });
      if (!upd.ok) {
        // Customer may have been deleted on PAY.JP side - recreate
        customerId = null;
      }
    }

    if (!customerId) {
      const created = await payjpRequest("POST", "/customers", {
        card: card_token,
        email: user.email || "",
        "metadata[supabase_user_id]": user.id,
      });
      if (!created.ok) {
        console.error("payjp customer create failed:", created.error);
        return json(
          { error: cardErrorMessage(created.error) },
          400
        );
      }
      customerId = created.data.id;
      await supabase
        .from("profiles")
        .update({ payjp_customer_id: customerId })
        .eq("id", user.id);
    }

    // 5. Create subscription (no trial: charge starts immediately)
    const subRes = await payjpRequest("POST", "/subscriptions", {
      customer: customerId!,
      plan: planId,
      "metadata[supabase_user_id]": user.id,
    });
    if (!subRes.ok) {
      console.error("payjp subscription create failed:", subRes.error);
      return json({ error: cardErrorMessage(subRes.error) }, 400);
    }

    const mapped = mapPayjpSubscription(subRes.data);

    // 6. Save to DB immediately (webhook also syncs later)
    const { error: upsertError } = await supabase.from("subscriptions").upsert({
      user_id: user.id,
      payjp_customer_id: customerId,
      payjp_subscription_id: subRes.data.id,
      plan: mapped.plan,
      status: mapped.status,
      current_period_start: mapped.current_period_start,
      current_period_end: mapped.current_period_end,
      cancel_at_period_end: mapped.cancel_at_period_end,
      updated_at: new Date().toISOString(),
    }, { onConflict: "user_id" });

    if (upsertError) {
      console.error("subscriptions upsert failed:", upsertError);
      return json({ error: "登録処理に失敗しました。お問い合わせください" }, 500);
    }

    console.log(`PAY.JP subscription created for user ${user.id}: ${mapped.plan}`);
    return json({ success: true, plan: mapped.plan });
  } catch (err) {
    console.error("payjp-subscribe error:", err);
    return json({ error: "Internal server error" }, 500);
  }
});

// Translate PAY.JP card errors into user-facing Japanese
function cardErrorMessage(error?: { code?: string; message?: string }): string {
  const code = error?.code || "";
  const table: Record<string, string> = {
    card_declined: "カードが拒否されました。別のカードをお試しください",
    expired_card: "カードの有効期限が切れています",
    invalid_cvc: "セキュリティコードが正しくありません",
    invalid_expiration_date: "有効期限が正しくありません",
    invalid_number: "カード番号が正しくありません",
    processing_error: "カード処理中にエラーが発生しました。時間をおいてお試しください",
  };
  return table[code] || "決済に失敗しました: " + (error?.message || "不明なエラー");
}
