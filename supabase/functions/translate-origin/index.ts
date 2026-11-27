import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { budgetGate } from "../_shared/ai-budget.ts";
import { checkTranslation, detectLang, parseReply } from "../_shared/translate-check.mjs";

/**
 * translate-origin (owner 2026-11-27)
 *
 * Drafts the translations that wait in origin_translations (status 'queued'): a contributor's Japanese words into
 * natural English, English words into natural Japanese. A draft is only a draft: nothing on the site changes until
 * the owner approves it in the admin (RPC decide_translation). Names stay in the Latin spelling as written.
 *
 * Called every 30 minutes by pg_cron (translate_origin_call, x-cron-token = CRON_TOKEN), or by the owner from the
 * admin (「今すぐ下書きを作る」, an admin JWT). Does nothing unless the secret TRANSLATE_ENABLED is "on", and stops at
 * the shared monthly AI budget (AI_MONTHLY_BUDGET_YEN, same as the origin research).
 * Secrets: ANTHROPIC_API_KEY; optional TRANSLATE_MODEL (default claude-sonnet-5-5), TRANSLATE_BATCH (default 5).
 */

const MODEL = Deno.env.get("TRANSLATE_MODEL") || "claude-sonnet-5-5";
const MAX_ATTEMPTS = 3;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-cron-token",
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

export const SYSTEM = `You translate origin records for Aroid Origins, a database of where Anthurium and other aroid plants
come from (who described, collected, bred or named a plant, when and where). A record was written by a grower or
collector, in Japanese or in English. You translate it into the other language.

Write the way a careful native writer of the target language would write the same record: natural, plain and
factual. Do not translate word for word; reorder, join or split sentences when that reads better. Keep every fact,
number, date, doubt and hedge ("とされる", "probably", "according to") exactly as strong as in the original. Add
nothing that is not in the original, explain nothing, and leave out nothing.

Names are never translated or transliterated:
- Scientific names (Anthurium crystallinum, A. warocqueanum, sect. Cardiolonchium, var., ssp., sp., aff., cf.),
  cultivar and clone names in quotes ('Ace of Spades', 'RA1'), people, nurseries, shops, places, collection numbers
  and codes stay exactly as the original writes them in Latin letters, letter for letter, with the same accents,
  capitals and quote marks.
- Into Japanese: never write a proper noun in katakana. "John Banta of NSE Tropicals in Florida" becomes
  "Florida の NSE Tropicals の John Banta", not "フロリダの…ジョン・バンタ". Countries, regions, rivers and mountains
  stay in Latin letters too (Colombia, Chocó, Río Ñambí), and so do locality labels such as sp. 'Peru'.
- Into English: a name the original writes in katakana must be written in its real Latin spelling. Do that only when
  you are sure of the spelling (well-known botanists, nurseries and places); if you are not sure, keep the katakana
  as it is and list it under "unsure_names". List every name you converted from katakana under "romanized".
- Japanese plant-trade words have usual English equivalents: 実生 seedling, 交配 cross, 作出 bred, 選抜 selected,
  原種 species, 記載 described, 自生地 habitat, 流通 in the trade.

Reply with JSON only, no other text:
{"source_language":"ja" or "en","translation":"...","romanized":[{"from":"katakana as written","to":"Latin spelling"}],"unsure_names":["..."],"note":"one short line for the editor if something in the original is unclear, else empty"}`;

export function userPrompt(row: { cultivar_name: string; src_text: string; hint?: string | null }, dst: string) {
  return [
    `Entry: ${row.cultivar_name}`,
    `Translate into: ${dst === "en" ? "English" : "Japanese"}`,
    row.hint ? `Editor's note for this translation (follow it): ${row.hint}` : "",
    "Original record:",
    "<<<",
    row.src_text,
    ">>>",
  ].filter(Boolean).join("\n");
}

async function callClaude(system: string, user: string) {
  const key = Deno.env.get("ANTHROPIC_API_KEY");
  if (!key) throw new Error("ANTHROPIC_API_KEY is not set");
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "x-api-key": key, "anthropic-version": "2023-06-01", "content-type": "application/json" },
    body: JSON.stringify({ model: MODEL, max_tokens: 4000, system, messages: [{ role: "user", content: user }] }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`Claude ${res.status}: ${String(data?.error?.message || "").slice(0, 200)}`);
  if (data.stop_reason === "refusal") throw new Error("Claude declined the request");
  const text = (data.content || []).filter((b: any) => b.type === "text").map((b: any) => b.text).join("");
  return { text, model: String(data.model || MODEL), inTok: data.usage?.input_tokens || 0, outTok: data.usage?.output_tokens || 0 };
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ ok: false }, 405);
  const url = Deno.env.get("SUPABASE_URL") || "";
  const token = Deno.env.get("CRON_TOKEN") || "";
  const fromCron = token.length >= 32 && req.headers.get("x-cron-token") === token;
  if (!fromCron) {
    const auth = req.headers.get("Authorization") || "";
    const userClient = createClient(url, Deno.env.get("SUPABASE_ANON_KEY") || "", { global: { headers: { Authorization: auth } } });
    const { data } = await userClient.auth.getUser().catch(() => ({ data: { user: null } }));
    if (data?.user?.app_metadata?.role !== "admin") return json({ ok: false, error: "admin only" }, 403);
  }
  if ((Deno.env.get("TRANSLATE_ENABLED") || "") !== "on") return json({ ok: true, skipped: "TRANSLATE_ENABLED is off" });

  const db = createClient(url, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "");
  const gate = await budgetGate(db);
  if (!gate.ok) return json({ ok: true, skipped: "budget", spent: gate.spent, budget: gate.budget });

  const batch = Math.max(1, Math.min(20, parseInt(Deno.env.get("TRANSLATE_BATCH") || "5", 10)));
  const { data: rows, error } = await db.from("origin_translations")
    .select("id, cultivar_name, src_text, hint, attempts")
    .eq("status", "queued").order("created_at").limit(batch);
  if (error) return json({ ok: false, error: error.message }, 500);

  const done: unknown[] = [];
  for (const row of rows || []) {
    const src = detectLang(row.src_text);
    const dst = src === "ja" ? "en" : "ja";
    try {
      const r = await callClaude(SYSTEM, userPrompt(row, dst));
      await db.from("ai_usage_log").insert({ provider: "anthropic", model: r.model, purpose: "translate", cultivar_name: row.cultivar_name, input_tokens: r.inTok, output_tokens: r.outTok, web_search_calls: 0 });
      const p = parseReply(r.text);
      const flags: unknown[] = checkTranslation(row.src_text, p.translation, dst);
      if (p.romanized.length) flags.push({ kind: "romanized", items: p.romanized.map((x: any) => `${x.from} → ${x.to}`) });
      if (p.unsure.length) flags.push({ kind: "unsure_names", items: p.unsure });
      if (p.note) flags.push({ kind: "note", items: [p.note] });
      await db.from("origin_translations").update({
        status: "drafted", src_lang: src, dst_lang: dst, draft_text: p.translation, flags, model: r.model,
        drafted_at: new Date().toISOString(), attempts: (row.attempts || 0) + 1, error: null,
      }).eq("id", row.id).eq("status", "queued");
      done.push({ id: row.id, ok: true });
    } catch (e) {
      const attempts = (row.attempts || 0) + 1;
      await db.from("origin_translations").update({
        status: attempts >= MAX_ATTEMPTS ? "failed" : "queued", attempts, error: String((e as Error)?.message || e).slice(0, 300),
      }).eq("id", row.id);
      done.push({ id: row.id, ok: false });
    }
  }
  return json({ ok: true, drafted: done.filter((d: any) => d.ok).length, tried: done.length });
});
