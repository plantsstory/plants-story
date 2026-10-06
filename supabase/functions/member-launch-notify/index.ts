import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

/**
 * member-launch-notify (BOARD 10-07b T86)
 *
 * Sends the ONE notice "membership is open" to the people on member_interest. Three locks, all required:
 *   1. Secrets MEMBER_NOTIFY_ENABLED=true — set only after the owner says "送ってよい" on the day membership opens
 *   2. the caller is an admin (their session token, checked server-side)
 *   3. notified_at is empty for the row (so nobody gets it twice)
 * With {"preview": true} it sends nothing and returns the count and the text; with {"sample": true} it sends one
 * copy to the operator's address only. No other mail is sent from here.
 */

const corsHeaders = {
  "Access-Control-Allow-Origin": "https://plantsstory.com",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const SUBJECT = "[Aroid Origins] 会員の受付を始めました";
const TEXT = [
  "Aroid Origins の会員受付を始めました。",
  "以前「受付開始をメールで受け取る」を押していただいた方に、この 1 回だけお送りしています。",
  "",
  "料金とサービス内容: https://plantsstory.com/pricing/",
  "",
  "このお知らせは 1 回だけです。今後このメールアドレスに宣伝をお送りすることはありません。",
].join("\n");

serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

  // lock 2: an admin's session
  const token = (req.headers.get("Authorization") || "").replace(/^Bearer\s+/i, "");
  const url = Deno.env.get("SUPABASE_URL") || "";
  const userClient = createClient(url, Deno.env.get("SUPABASE_ANON_KEY") || "", { global: { headers: { Authorization: `Bearer ${token}` } } });
  const { data: isAdmin } = await userClient.rpc("is_admin");
  if (isAdmin !== true) return json({ ok: false, error: "admin only" }, 403);

  let body: Record<string, unknown> = {};
  try { body = await req.json(); } catch { /* empty */ }
  const db = createClient(url, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "");
  const { data: rows, error } = await db.from("member_interest").select("user_id").is("notified_at", null);
  if (error) return json({ ok: false, error: "db" }, 500);
  const pending = rows || [];

  if (body.preview) return json({ ok: true, pending: pending.length, subject: SUBJECT, text: TEXT, enabled: Deno.env.get("MEMBER_NOTIFY_ENABLED") === "true" });

  const resendKey = Deno.env.get("RESEND_API_KEY");
  if (!resendKey) return json({ ok: false, error: "no mail key" }, 500);
  const send = (to: string) => fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${resendKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from: "Aroid Origins <noreply@plantsstory.com>", to: [to], subject: SUBJECT, text: TEXT }),
  });

  if (body.sample) {
    const r = await send(Deno.env.get("ALERT_EMAIL") || "plantsstory2026@gmail.com");
    return json({ ok: r.ok, sample: true });
  }

  // lock 1: the owner's approval
  if (Deno.env.get("MEMBER_NOTIFY_ENABLED") !== "true") return json({ ok: false, error: "not approved (MEMBER_NOTIFY_ENABLED)" }, 403);

  let sent = 0, failed = 0;
  for (const row of pending) {
    // lock 3: claim the row before sending
    const { data: claimed } = await db.from("member_interest").update({ notified_at: new Date().toISOString() })
      .eq("user_id", row.user_id).is("notified_at", null).select("user_id");
    if (!claimed || !claimed.length) continue;
    const { data: u } = await db.auth.admin.getUserById(row.user_id);
    const email = u && u.user && u.user.email;
    if (!email) { failed++; continue; }
    const r = await send(email);
    if (r.ok) sent++;
    else { failed++; await db.from("member_interest").update({ notified_at: null }).eq("user_id", row.user_id); }
  }
  return json({ ok: true, sent, failed });
});
