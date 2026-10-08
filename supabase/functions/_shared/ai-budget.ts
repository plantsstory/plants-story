// Monthly AI budget (owner, 2026-10-08: 「月の上限を定める＋1クリックを安くする」).
// The month's spend is estimated from ai_usage_log at OpenAI's published prices. Once the month
// (Japan time) reaches AI_MONTHLY_BUDGET_YEN, every AI run stops, the admin's included, until the
// next month. OpenAI's own monthly limit, set by the owner in the OpenAI dashboard, is the second wall.

// USD per 1M tokens (developers.openai.com/api/docs/pricing, checked 2026-10-08)
const PRICES: Record<string, { in: number; out: number }> = {
  "gpt-5-nano": { in: 0.05, out: 0.40 },
  "gpt-5-mini": { in: 0.25, out: 2.00 },
  "gpt-6-luna": { in: 0.10, out: 0.50 },
};
const SEARCH_USD = 0.01;            // web search: $10 per 1,000 calls
const FALLBACK = PRICES["gpt-5-mini"];

function priceOf(model: string) {
  const m = String(model || "");
  // the log carries dated names such as gpt-5-mini-2025-08-07
  const key = Object.keys(PRICES).sort((a, b) => b.length - a.length).find((k) => m.startsWith(k));
  return key ? PRICES[key] : FALLBACK;
}

export function usdOf(row: { model?: string; input_tokens?: number; output_tokens?: number; web_search_calls?: number }) {
  const p = priceOf(row.model || "");
  return (row.input_tokens || 0) / 1e6 * p.in + (row.output_tokens || 0) / 1e6 * p.out + (row.web_search_calls || 0) * SEARCH_USD;
}

export function yenPerUsd() {
  return parseFloat(Deno.env.get("AI_YEN_PER_USD") || "155");
}

// start of this month in Japan time, as an ISO string
function monthStartJst() {
  const jst = new Date(Date.now() + 9 * 3600e3);
  return new Date(Date.UTC(jst.getUTCFullYear(), jst.getUTCMonth(), 1) - 9 * 3600e3).toISOString();
}

// deno-lint-ignore no-explicit-any
export async function monthSpendYen(db: any): Promise<number> {
  const { data, error } = await db.from("ai_usage_log")
    .select("model,input_tokens,output_tokens,web_search_calls")
    .gte("created_at", monthStartJst())
    .limit(20000);
  if (error) throw new Error(error.message);
  // deno-lint-ignore no-explicit-any
  const usd = (data || []).reduce((s: number, r: any) => s + usdOf(r), 0);
  return Math.round(usd * yenPerUsd());
}

// ok=false also when the spend cannot be read: money is not spent on a guess
// deno-lint-ignore no-explicit-any
export async function budgetGate(db: any): Promise<{ ok: boolean; spent: number; budget: number }> {
  const budget = parseInt(Deno.env.get("AI_MONTHLY_BUDGET_YEN") || "1200", 10);
  try {
    const spent = await monthSpendYen(db);
    return { ok: spent < budget, spent, budget };
  } catch (_e) {
    return { ok: false, spent: -1, budget };
  }
}

export function budgetRefusal(spent: number, budget: number) {
  return spent < 0
    ? "AI の利用額を確かめられなかったため、AI 調査を止めました。時間をおいてお試しください。"
    : `今月の AI 調査の予算（${budget.toLocaleString("ja-JP")} 円）に達しました。来月まで AI 調査は止まります（品種の登録や記録の追加はできます）。`;
}
