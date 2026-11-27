import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { budgetGate } from "../_shared/ai-budget.ts";
import {
  freeChecks, gbifFlag, gbifQuery, hasMarks, parseAiReply, recordText, similarNames, SYSTEM, tidy, userPrompt,
} from "../_shared/post-check.mjs";

/**
 * post-check (owner 2026-11-27)
 *
 * Checks each new entry ONCE: the kind (原種 incl. sp. / Hybrid / Clone / 実生) and the spelling of the name.
 * The trigger on cultivars INSERT queues one row in post_checks and calls this function; a cron sweep every
 * 30 minutes calls it again only when a row still waits. An edit or a page view never queues anything.
 *
 * Order: the free checks (the site's naming rules, the registered list, GBIF species/match), then the AI once, with
 * what the free checks found. The AI runs only when the secret POSTCHECK_AI is "on" and the shared monthly AI budget
 * (AI_MONTHLY_BUDGET_YEN, same as the origin research and the translations) is not reached; otherwise the row is
 * stored with the free checks only. A row is never sent to the AI a second time.
 * Nothing in the entry is changed: the flags wait in the admin (投稿の点検) for the owner.
 * Called with x-cron-token = CRON_TOKEN (trigger and sweep), or by the owner from the admin (admin JWT).
 * Secrets: ANTHROPIC_API_KEY; optional POSTCHECK_MODEL (default claude-sonnet-5-5), POSTCHECK_BATCH (default 5).
 */

const MODEL = Deno.env.get("POSTCHECK_MODEL") || "claude-sonnet-5-5";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-cron-token",
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

async function gbif(name: string) {
  const ctl = new AbortController();
  const to = setTimeout(() => ctl.abort(), 6000);
  try {
    const r = await fetch("https://api.gbif.org/v1/species/match?kingdom=Plantae&name=" + encodeURIComponent(name), { signal: ctl.signal });
    return r.ok ? await r.json() : null;
  } catch {
    return null;   // GBIF down: the check goes on without it
  } finally {
    clearTimeout(to);
  }
}

async function callClaude(system: string, user: string) {
  const key = Deno.env.get("ANTHROPIC_API_KEY");
  if (!key) throw new Error("ANTHROPIC_API_KEY is not set");
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "x-api-key": key, "anthropic-version": "2023-06-01", "content-type": "application/json" },
    body: JSON.stringify({ model: MODEL, max_tokens: 700, system, messages: [{ role: "user", content: user }] }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`Claude ${res.status}: ${String(data?.error?.message || "").slice(0, 200)}`);
  // deno-lint-ignore no-explicit-any
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

  const db = createClient(url, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "");
  const batch = Math.max(1, Math.min(20, parseInt(Deno.env.get("POSTCHECK_BATCH") || "5", 10)));
  const { data: rows, error } = await db.rpc("claim_post_checks", { p_limit: batch });
  if (error) return json({ ok: false, error: error.message }, 500);
  if (!rows || !rows.length) return json({ ok: true, checked: 0 });

  const list = await db.from("cultivars").select("id, cultivar_name, genus, type, aliases, tags").limit(5000);
  const aiOn = (Deno.env.get("POSTCHECK_AI") || "") === "on";

  const done: unknown[] = [];
  for (const pc of rows) {
    let aiAsked = false;
    try {
      if (list.error) throw new Error(list.error.message);
      const { data: row, error: e1 } = await db.from("cultivars")
        .select("id, cultivar_name, genus, type, tags, aliases, origins, parent_a_text, parent_b_text, formula_status")
        .eq("id", pc.cultivar_id).maybeSingle();
      if (e1) throw new Error(e1.message);
      if (!row) {
        await db.from("post_checks").update({ status: "failed", error: "entry deleted", checked_at: new Date().toISOString() }).eq("id", pc.id);
        continue;
      }
      const others = list.data || [];
      const flags: unknown[] = freeChecks(row, others);
      const q = gbifQuery(row);
      const g = q ? await gbif(q) : null;
      const gf = q ? gbifFlag(q, g) : null;
      if (gf) flags.push(gf);

      let model: string | null = null;
      let note: string | null = null;
      if (aiOn) {
        const gate = await budgetGate(db);
        if (gate.ok) {
          aiAsked = true;
          try {
            const r = await callClaude(SYSTEM, userPrompt(row, {
              recordText: recordText(row), flags, similar: similarNames(row, others),
              gbif: q ? { name: q, matchType: g?.matchType, canonicalName: g?.canonicalName } : null,
            }));
            model = r.model;
            await db.from("ai_usage_log").insert({ provider: "anthropic", model: r.model, purpose: "post_check", cultivar_name: row.cultivar_name, input_tokens: r.inTok, output_tokens: r.outTok, web_search_calls: 0 });
            flags.push(...parseAiReply(r.text, row).flags);
          } catch (e) {
            // the AI is not asked again for this post: the free checks are kept, with a note
            note = "AI の点検はできませんでした（" + String((e as Error)?.message || e).slice(0, 120) + "）";
          }
        } else {
          note = gate.spent < 0 ? "AI の利用額を読めなかったため、AI の点検は飛ばしました" : "今月の AI の予算に達したため、AI の点検は飛ばしました";
        }
      }
      const shown = tidy(flags);
      await db.from("post_checks").update({
        status: "checked", flags: shown, marked: hasMarks(shown), ai_used: !!model, model, error: note,
        checked_at: new Date().toISOString(),
      }).eq("id", pc.id);
      done.push({ id: pc.id, ok: true, ai: !!model });
    } catch (e) {
      // before the AI was asked: try again on the next call (3 times at most). After: never again.
      const msg = String((e as Error)?.message || e).slice(0, 300);
      const again = !aiAsked && (pc.attempts || 0) < 3;
      await db.from("post_checks").update({ status: again ? "queued" : "failed", error: msg, ...(again ? {} : { checked_at: new Date().toISOString() }) }).eq("id", pc.id);
      done.push({ id: pc.id, ok: false });
    }
  }
  return json({ ok: true, checked: done.filter((d: any) => d.ok).length, tried: done.length, ai: aiOn });
});
