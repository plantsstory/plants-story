import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { payjpRequest } from "../_shared/payjp.ts";

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
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "No auth header" }, 401);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) return json({ error: "Invalid token" }, 401);

    const { data: sub } = await supabase
      .from("subscriptions")
      .select("payjp_subscription_id, status, plan, current_period_end, cancel_at_period_end")
      .eq("user_id", user.id)
      .single();

    if (!sub || !sub.payjp_subscription_id) {
      return json({ error: "有効なサブスクリプションが見つかりません" }, 404);
    }
    if (sub.cancel_at_period_end) {
      return json({ success: true, already_canceled: true, current_period_end: sub.current_period_end });
    }

    // PAY.JP cancel: no further renewals; paid period stays valid until
    // current_period_end (resume is possible on the PAY.JP side until then)
    const res = await payjpRequest(
      "POST",
      `/subscriptions/${sub.payjp_subscription_id}/cancel`
    );
    if (!res.ok) {
      // Already canceled/deleted on PAY.JP side: treat as canceled
      console.error("payjp cancel failed:", res.error);
      if (res.error?.status !== 404) {
        return json({ error: "解約処理に失敗しました。お問い合わせください" }, 500);
      }
    }

    await supabase.from("subscriptions").update({
      cancel_at_period_end: true,
      updated_at: new Date().toISOString(),
    }).eq("user_id", user.id);

    console.log(`PAY.JP subscription canceled (at period end) for user ${user.id}`);
    return json({ success: true, current_period_end: sub.current_period_end });
  } catch (err) {
    console.error("payjp-cancel error:", err);
    return json({ error: "Internal server error" }, 500);
  }
});
