import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

/**
 * admin-digest (admin reorganisation 2026-11-26)
 *
 * Called once a day by pg_cron (admin_digest_call, 08:00 JST) with the vault token in x-cron-token. Counts what
 * waits on the owner in the admin and, only when something does, sends ONE mail to the operator's own address
 * (ALERT_EMAIL, else the published contact address). It never mails anyone else and changes no data.
 * Counted: open reports, unhandled contact messages, pending AI suggestions, open re-research requests, listing
 * requests from the last day, entries whose check must be redone, and entries and photos that other people added in
 * the last day (the owner's own posts are left out), and translations waiting for approval (翻訳の確認, 11-27).
 */

const OWNER_ID = "629508da-9fdd-4d3a-9ec6-22fd3bdb7346";
const ADMIN_URL = "https://aroidorigins.com/admin.html";

serve(async (req: Request) => {
  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
  const token = Deno.env.get("CRON_TOKEN") || "";
  if (req.method !== "POST" || token.length < 32 || req.headers.get("x-cron-token") !== token) {
    return json({ ok: false }, 403);
  }
  let dryRun = false;
  try { dryRun = (await req.json()).dry_run === true; } catch { /* empty body */ }

  const db = createClient(Deno.env.get("SUPABASE_URL") || "", Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "");
  const since = new Date(Date.now() - 24 * 3600 * 1000).toISOString();
  const head = { count: "exact" as const, head: true };

  const [reports, contact, ais, rr, genus, verify, entries, photos, trs] = await Promise.all([
    db.from("deletion_requests").select("id", head).eq("status", "pending"),
    db.from("contact_messages").select("id", head).or("status.is.null,status.neq.done"),
    db.from("ai_suggestions").select("id", head).eq("status", "pending"),
    db.from("research_requests").select("id", head).in("status", ["pending", "approved"]),
    db.from("genus_requests").select("id", head).gte("created_at", since),
    db.from("cultivars").select("id", head).like("verification_note", "[要再確認]%"),
    db.from("cultivars").select("cultivar_name").not("user_id", "is", null).neq("user_id", OWNER_ID).gte("created_at", since).limit(10),
    db.from("cultivar_images").select("id", head).not("user_id", "is", null).neq("user_id", OWNER_ID).gte("created_at", since),
    db.from("origin_translations").select("id", head).eq("status", "drafted"),
  ]);
  // before the translation migration is applied the table is missing: count it as 0, not as a failed digest
  if (trs.error) (trs as { count: number | null }).count = 0;
  const failed = [reports, contact, ais, rr, genus, verify, entries, photos].find((r) => r.error);
  if (failed) return json({ ok: false, error: "db", detail: failed.error?.message }, 500);

  const n = (r: { count: number | null }) => r.count || 0;
  const newEntries = (entries.data || []) as { cultivar_name: string }[];
  const lines: string[] = [];
  if (n(reports)) lines.push(`報告: ${n(reports)} 件（記録の誤り・写真）`);
  if (n(contact)) lines.push(`お問い合わせ: 未対応 ${n(contact)} 件`);
  if (n(ais)) lines.push(`AI の提案: 確認待ち ${n(ais)} 件`);
  if (n(trs)) lines.push(`翻訳の確認: 反映待ち ${n(trs)} 件（英訳・和訳の下書き）`);
  if (n(rr)) lines.push(`再調査の依頼: ${n(rr)} 件`);
  if (n(genus)) lines.push(`収録の依頼: この1日で ${n(genus)} 件`);
  if (n(verify)) lines.push(`検証のやり直し: ${n(verify)} 件`);
  if (newEntries.length) lines.push(`ほかの人が足した記録: この1日で ${newEntries.length}${newEntries.length >= 10 ? " 件以上" : " 件"}（${newEntries.slice(0, 5).map((e) => e.cultivar_name).join("、")}）`);
  if (n(photos)) lines.push(`ほかの人が足した写真: この1日で ${n(photos)} 枚`);

  if (!lines.length) return json({ ok: true, sent: false, reason: "nothing waits" });
  const text = [
    "管理画面で待っているものです。",
    "",
    ...lines.map((l) => "・" + l),
    "",
    `管理画面を開く: ${ADMIN_URL}`,
    "",
    "— 待っているものがない日は届きません。",
  ].join("\n");
  if (dryRun) return json({ ok: true, sent: false, dry_run: true, text });

  const resendKey = Deno.env.get("RESEND_API_KEY");
  if (!resendKey) return json({ ok: true, sent: false, reason: "no mail key" });
  const to = Deno.env.get("ALERT_EMAIL") || "plantsstory2026@gmail.com";
  const total = lines.length;
  try {
    const r = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${resendKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: "Aroid Origins <noreply@plantsstory.com>",
        to: [to],
        subject: `[Aroid Origins] 管理画面で待っているもの（${total} 種類）`,
        text,
      }),
    });
    if (!r.ok) return json({ ok: false, error: "mail", status: r.status }, 502);
  } catch {
    return json({ ok: false, error: "mail" }, 502);
  }
  return json({ ok: true, sent: true });
});
