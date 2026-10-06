import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

/**
 * contact-notify (BOARD 10-07b T81)
 *
 * The contact page calls this with the id that submit_contact_message returned. The function sends ONE notice to the
 * operator's address (ALERT_EMAIL, else the published contact address) — never to an address from the form — and marks
 * the message notified_at so a second call does nothing. Only messages from the last 15 minutes are sent, so an old
 * id cannot be replayed. No auto-reply is sent to the person who wrote.
 */

const corsHeaders = {
  "Access-Control-Allow-Origin": "https://plantsstory.com",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const CATEGORY_JA: Record<string, string> = {
  general: "一般", copyright: "著作権", deletion: "削除要請", bug: "不具合", shop: "取扱店の掲載",
};
const ID = /^[0-9]{1,18}$/;

serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  let id = "";
  try { id = String((await req.json()).id || ""); } catch { /* empty body */ }
  if (!ID.test(id)) return json({ ok: false, error: "bad id" }, 400);

  const db = createClient(Deno.env.get("SUPABASE_URL") || "", Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "");
  const since = new Date(Date.now() - 15 * 60 * 1000).toISOString();
  // claim the message first (only one caller can flip notified_at from null)
  const { data: rows, error } = await db.from("contact_messages")
    .update({ notified_at: new Date().toISOString() })
    .eq("id", id).is("notified_at", null).gte("created_at", since)
    .select("name, email, category, message, created_at");
  if (error) return json({ ok: false, error: "db" }, 500);
  const m = (rows || [])[0];
  if (!m) return json({ ok: true, sent: false });

  const resendKey = Deno.env.get("RESEND_API_KEY");
  if (!resendKey) return json({ ok: true, sent: false, reason: "no mail key" });
  const to = Deno.env.get("ALERT_EMAIL") || "plantsstory2026@gmail.com";
  const cat = CATEGORY_JA[m.category] || m.category;
  const text = [
    `区分: ${cat}`,
    `お名前: ${m.name}`,
    `メール: ${m.email}`,
    `受付: ${m.created_at}`,
    "",
    m.message,
    "",
    "— 管理画面の「お問い合わせ」に同じ内容があります。返信はこのメールに返信してください（送り主に届きます）。",
  ].join("\n");
  try {
    const r = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${resendKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: "Aroid Origins <noreply@plantsstory.com>",
        to: [to],
        reply_to: m.email,
        subject: `[Aroid Origins] お問い合わせ（${cat}）`,
        text,
      }),
    });
    if (!r.ok) {
      // let a later call try again
      await db.from("contact_messages").update({ notified_at: null }).eq("id", id);
      return json({ ok: false, error: "mail " + r.status }, 502);
    }
  } catch {
    await db.from("contact_messages").update({ notified_at: null }).eq("id", id);
    return json({ ok: false, error: "mail" }, 502);
  }
  return json({ ok: true, sent: true });
});
