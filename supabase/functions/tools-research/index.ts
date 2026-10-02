// Tools catalogue research (admin only). One department per call:
//   POST { genre: "soil", publish: true }      → search Rakuten Ichiba for each active keyword, keep items with
//                                               enough reviews, let the model pick the relevant ones and write a
//                                               clean name and a neutral description, insert them.
//   POST { mode: "refresh" }                   → re-read price, image and stock for the Rakuten items already listed.
// Needs secrets RAKUTEN_APP_ID and RAKUTEN_ACCESS_KEY (Rakuten Developers, 2026 API). The affiliate id is public
// (it is in every Rakuten link on the site), so it lives here.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const ALLOWED_ORIGINS = ["https://plantsstory.com", "https://plantsstory.github.io", "http://localhost:3000", "http://127.0.0.1:3000", "http://localhost:8123"];
const RAKUTEN_ENDPOINT = "https://openapi.rakuten.co.jp/ichibams/api/IchibaItem/Search/20260701";
const RAKUTEN_AFFILIATE_ID = Deno.env.get("RAKUTEN_AFFILIATE_ID") || "51ddadd6.592101ce.51ddadd7.b054826c";
const OPENAI_MODEL = Deno.env.get("OPENAI_MODEL") || "gpt-5-mini";
const MIN_RATING = 4.0;
const BANNED = ["おすすめ", "オススメ", "最安", "ランキング", "効く", "効果", "改善", "治る", "No.1", "NO.1", "ナンバーワン"];
const BANDS: [number, string][] = [[1000, "〜1,000円"], [2000, "1,000〜2,000円"], [3000, "2,000〜3,000円"], [5000, "3,000〜5,000円"], [10000, "5,000〜10,000円"], [20000, "10,000〜20,000円"]];

function cors(req: Request) {
  const origin = req.headers.get("origin") || "";
  return {
    "Access-Control-Allow-Origin": ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0],
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  };
}
function json(req: Request, body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...cors(req), "Content-Type": "application/json" } });
}
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
function band(price: number) { for (const [max, label] of BANDS) if (price < max) return label; return "20,000円〜"; }
function clean(s: string) { return BANNED.reduce((t, w) => t.split(w).join(""), String(s || "")).replace(/\d[\d,]*\s*円/g, "").trim(); }

// The 2026 API answers in either the flat (formatVersion=2) or the wrapped shape; read both.
function firstImage(v: unknown): string {
  const a = Array.isArray(v) ? v : [];
  const x = a[0] as any;
  const url = typeof x === "string" ? x : (x && x.imageUrl) || "";
  return url ? url.replace(/\?_ex=\d+x\d+/, "?_ex=300x300") : "";
}
function items(data: any): any[] {
  const list = data?.Items || data?.items || [];
  return list.map((x: any) => x?.Item || x);
}

async function rakuten(params: Record<string, string>) {
  const appId = Deno.env.get("RAKUTEN_APP_ID"), accessKey = Deno.env.get("RAKUTEN_ACCESS_KEY");
  if (!appId || !accessKey) throw new Error("RAKUTEN_APP_ID / RAKUTEN_ACCESS_KEY が設定されていません");
  const q = new URLSearchParams({ applicationId: appId, accessKey, affiliateId: RAKUTEN_AFFILIATE_ID, formatVersion: "2", ...params });
  for (let attempt = 0; attempt < 3; attempt++) {
    const r = await fetch(RAKUTEN_ENDPOINT + "?" + q.toString(), { headers: { accessKey } });
    if (r.status === 429) { await sleep(2000 * (attempt + 1)); continue; }
    const data = await r.json();
    if (data?.errors || data?.error) throw new Error("楽天 API: " + (data.errors?.errorMessage || data.error_description || data.error || JSON.stringify(data.errors)));
    return items(data);
  }
  throw new Error("楽天 API: アクセスが集中しています（429）");
}

async function askModel(system: string, user: string) {
  const key = Deno.env.get("OPENAI_API_KEY");
  if (!key) throw new Error("OPENAI_API_KEY がありません");
  const r = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: "Bearer " + key },
    body: JSON.stringify({ model: OPENAI_MODEL, instructions: system, input: user, max_output_tokens: 16000 }),
  });
  const data = await r.json();
  if (data?.error) throw new Error(data.error.message || "OpenAI error");
  let text = "";
  for (const item of data?.output || []) if (item.type === "message") for (const c of item.content || []) if (c.type === "output_text") text += c.text || "";
  const m = text.match(/\[[\s\S]*\]/);
  return { picks: m ? JSON.parse(m[0]) : [], usage: data?.usage };
}

const SYSTEM = `あなたは室内でアロイド（アンスリウムなど熱帯の観葉植物）を育てる人のための道具の目録を編集しています。
楽天市場の検索結果から、指定の部門にはっきり当てはまる商品だけを選び、JSON 配列だけを返します。
各要素: {"i": 候補番号, "name": "道具の名前（日本語、28字以内。【】・送料無料・ポイント・宣伝文句・型番の羅列を入れない。ブランド名と容量・サイズは入れてよい）", "maker": "メーカー名（分からなければ空文字）", "model": "型番（あれば）", "spec": "規格・容量・サイズ（あれば）", "summary": "どんな道具か（40字以内）", "description": "商品の説明（120〜200字）"}
説明文のルール:
- 事実だけを書く（素材、大きさ、容量、仕組み、どんな場面で使われる道具か）。
- 「おすすめ」「最安」「ランキング」「効く」「効果」「改善」「治る」「No.1」は使わない。
- 肥料・活力剤は成分表示と容量だけ。効能・用量・使う頻度は書かない。
- 育て方（水やりの頻度、配合の比率、置き場所の指示）は書かない。
- 価格の数字は書かない。
- 商品ページにない性能を推測で書かない。
選ばない商品: 部門に合わない物、植物そのもの、まとめ売りや詰め合わせ、既存の掲載品と同じ商品、ほかの候補とほぼ同じ商品。
各キーワードにつき最大 max 件。合う物がなければ空配列 [] を返す。`;

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors(req) });
  try {
    // admin only
    const auth = req.headers.get("Authorization") || "";
    const userClient = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, { global: { headers: { Authorization: auth } } });
    const { data: { user } } = await userClient.auth.getUser();
    if (!user || user.app_metadata?.role !== "admin") return json(req, { error: "admin only" }, 403);
    const db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const body = await req.json().catch(() => ({}));

    if (body.mode === "refresh") {
      const { data: rows } = await db.from("affiliates").select("id, ext_id").eq("source", "rakuten").not("ext_id", "is", null);
      let updated = 0, gone = 0;
      for (const row of rows || []) {
        const found = await rakuten({ itemCode: row.ext_id, hits: "1" });
        await sleep(1100);
        const it = found[0];
        if (!it || it.availability === 0) { await db.from("affiliates").update({ is_published: false, price_checked_at: new Date().toISOString() }).eq("id", row.id); gone++; continue; }
        await db.from("affiliates").update({ price: it.itemPrice, price_band: band(it.itemPrice), price_checked_at: new Date().toISOString(), image: firstImage(it.mediumImageUrls) || undefined, rakuten: it.affiliateUrl || undefined, review_count: it.reviewCount, review_average: it.reviewAverage }).eq("id", row.id);
        updated++;
      }
      return json(req, { updated, unpublished: gone });
    }

    const genre = String(body.genre || "");
    const { data: g } = await db.from("tool_genres").select("slug, label").eq("slug", genre).single();
    if (!g) return json(req, { error: "unknown genre" }, 400);
    const { data: queries } = await db.from("tool_research_queries").select("*").eq("genre", genre).eq("is_active", true).order("id");
    if (!queries || !queries.length) return json(req, { added: 0, note: "この部門の検索語がありません" });
    const { data: existing } = await db.from("affiliates").select("product_name, ext_id, source").eq("genre", genre);
    const known = new Set((existing || []).filter((x: any) => x.ext_id).map((x: any) => x.ext_id));

    // 1) Rakuten: the most-reviewed items per keyword, rated 4.0 and up, in stock, with an image
    const pool: any[] = [];
    for (const q of queries) {
      const found = await rakuten({ keyword: q.keyword, hits: "15", sort: "-reviewCount", availability: "1", imageFlag: "1", minPrice: "200" });
      await sleep(1100);
      found.filter((it) => !known.has(it.itemCode) && (it.reviewCount || 0) >= q.min_reviews && Number(it.reviewAverage || 0) >= MIN_RATING)
        .slice(0, 6)
        .forEach((it) => pool.push({ q, it }));
      await db.from("tool_research_queries").update({ last_run_at: new Date().toISOString() }).eq("id", q.id);
    }
    if (!pool.length) return json(req, { added: 0, note: "条件に合う商品が見つかりませんでした（レビュー数・評価の条件）" });

    // 2) the model picks and writes; candidates are numbered across keywords
    const listing = pool.map((p, i) => `#${i} [キーワード: ${p.q.keyword} / max ${p.q.max_items}] ${p.it.itemName} ｜ ショップ: ${p.it.shopName} ｜ レビュー ${p.it.reviewCount}件 ★${p.it.reviewAverage} ｜ 説明: ${String(p.it.itemCaption || "").replace(/\s+/g, " ").slice(0, 260)}`).join("\n");
    const prompt = `部門: ${g.label}\n既存の掲載品: ${(existing || []).map((x: any) => x.product_name).join(" / ") || "なし"}\n\n候補:\n${listing}`;
    const { picks, usage } = await askModel(SYSTEM, prompt);
    db.from("ai_usage_log").insert({ provider: "openai", model: OPENAI_MODEL, purpose: "tools_research:" + genre, input_tokens: usage?.input_tokens, output_tokens: usage?.output_tokens }).then(() => {}, () => {});

    // 3) insert; keep per-keyword caps even if the model ignores them
    const perKeyword: Record<string, number> = {};
    const { data: maxRow } = await db.from("affiliates").select("sort_order").order("sort_order", { ascending: false }).limit(1);
    let order = (maxRow && maxRow[0] ? maxRow[0].sort_order : 0) + 1;
    const rows: any[] = [];
    for (const p of Array.isArray(picks) ? picks : []) {
      const c = pool[Number(p.i)];
      if (!c || known.has(c.it.itemCode)) continue;
      const kw = c.q.keyword;
      if ((perKeyword[kw] || 0) >= c.q.max_items) continue;
      const name = clean(p.name).slice(0, 40), description = clean(p.description), summary = clean(p.summary).slice(0, 60);
      if (!name || !c.it.affiliateUrl) continue;
      perKeyword[kw] = (perKeyword[kw] || 0) + 1;
      known.add(c.it.itemCode);
      rows.push({
        name: g.label, genre, source: "rakuten", ext_id: c.it.itemCode,
        slug: ("rk-" + String(c.it.itemCode).toLowerCase().replace(/[^a-z0-9]+/g, "-")).replace(/-+$/, "").slice(0, 60),
        product_name: name, maker: clean(p.maker) || null, model: clean(p.model) || null, spec: clean(p.spec) || null,
        summary, description, image: firstImage(c.it.mediumImageUrls), rakuten: c.it.affiliateUrl,
        price: c.it.itemPrice, price_band: band(c.it.itemPrice), price_checked_at: new Date().toISOString(),
        shop_name: c.it.shopName, review_count: c.it.reviewCount, review_average: c.it.reviewAverage,
        is_published: body.publish !== false, sort_order: order++, icon: "",
      });
    }
    if (rows.length) {
      const { error } = await db.from("affiliates").insert(rows);
      if (error) throw error;
    }
    return json(req, { added: rows.length, considered: pool.length, names: rows.map((r) => r.product_name) });
  } catch (e) {
    return json(req, { error: String((e as Error).message || e) }, 500);
  }
});
