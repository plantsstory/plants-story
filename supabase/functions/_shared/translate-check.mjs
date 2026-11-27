// Checks on an AI translation of a contributor's text (owner 2026-11-27: 「名詞や人名をカタカナにしてしまわないように。
// 英語のままで、訳すと間違ったスペルにならないように」). Pure functions, used by the translate-origin edge function
// (Deno) and by the tests (node). Nothing here calls a model; the flags only tell the owner where to look before
// approving.

const JA_RE = /[぀-ヿ㐀-鿿ｦ-ﾟ]/g;
const KANA_RUN_RE = /[゠-ヿㇰ-ㇿｦ-ﾟ]{2,}/g;

// 'ja' or 'en': Japanese when it has a few Japanese characters and they are not outnumbered by Latin words
// (a Japanese sentence carries many Latin names; an English one may quote one Japanese alias)
export function detectLang(text) {
  const s = String(text || "");
  const ja = (s.match(JA_RE) || []).length;
  const words = (s.match(/[A-Za-zÀ-ɏ]{2,}/g) || []).length;
  if (ja >= 5 && ja >= words) return "ja";
  if (ja >= 2 && words <= 3) return "ja";
  return "en";
}

export function hasJapanese(text) {
  return /[぀-ヿ㐀-鿿ｦ-ﾟ]/.test(String(text || ""));
}

// curly quotes and the × sign written as x do not count as a changed name
function norm(s) {
  return String(s || "").replace(/[‘’`´]/g, "'").replace(/[“”]/g, '"').replace(/\s+/g, " ");
}

const GENERA = ["Anthurium", "Philodendron", "Monstera", "Alocasia", "Syngonium", "Rhaphidophora", "Spathiphyllum",
  "Scindapsus", "Epipremnum", "Amorphophallus", "Caladium", "Colocasia", "Xanthosoma", "Dieffenbachia", "Aglaonema",
  "Homalomena", "Schismatoglottis", "Pothos", "Stenospermation", "Zantedeschia", "Arisaema", "Typhonium", "Thaumatophyllum"];

// words an English sentence may start with that are not names
const COMMON = new Set(("The This That These Those It Its A An In On At From To For By Of With As And But Or So " +
  "He She They We I You His Her Their Our My There Here When Where While After Before Since During Then Now " +
  "Found Described Named Collected Originally Known Also Later First One Two Three Some Many Most No Not Only " +
  "Bred Grown Imported Introduced Selected Discovered Registered Sold Seen Said Probably Possibly Likely " +
  "According Unknown Unlike Like Both Each Every All Other Another Such What Which Who Why How If Unless " +
  "Hybrid Clone Seedling Species Plants Plant Leaves Leaf Note Notes See").split(" "));

// The names a translation must carry over letter for letter: quoted names ('Ace of Spades'), scientific names
// (Anthurium crystallinum, A. crystallinum), and words that start with a capital or hold a digit or an accent
// (people, nurseries, places, numbers such as RA1). In English text a capitalised first word of a sentence is a
// name only when it is not an ordinary word.
export function requiredNames(text) {
  const s = norm(text);
  const out = [];
  const add = (x) => { const v = x.trim(); if (v && out.indexOf(v) === -1) out.push(v); };
  let m;
  const quoted = /'([^'\n]{1,60})'|"([^"\n]{1,60})"/g;
  while ((m = quoted.exec(s))) {
    const inner = (m[1] || m[2] || "").trim();
    // a quote around Japanese words is speech, not a name
    if (inner && !hasJapanese(inner)) add(m[0]);
  }
  const sci = new RegExp("\\b(?:" + GENERA.join("|") + "|[A-Z]\\.)\\s?([a-z][a-z-]{2,})\\b", "g");
  while ((m = sci.exec(s))) add(m[1]);
  const isEn = detectLang(s) === "en";
  const word = /[A-Za-z0-9À-ɏ][A-Za-z0-9À-ɏ.&'-]*/g;
  while ((m = word.exec(s))) {
    let w = m[0].replace(/[.'-]+$/, "");
    if (w.length < 2 && !/\d/.test(w)) continue;
    const capital = /^[A-ZÀ-Þ]/.test(w);
    const marked = /\d/.test(w) || /[À-ɏ]/.test(w);
    if (!capital && !marked) continue;
    if (/^\d+$/.test(w)) { if (w.length === 4) add(w); continue; }   // a year stays a year
    if (isEn && capital && !marked) {
      const before = s.slice(0, m.index).replace(/\s+$/, "");
      const start = !before || /[.!?:;]$/.test(before);
      if (COMMON.has(w) || (start && COMMON.has(w))) continue;
    }
    add(w);
  }
  return out;
}

// common katakana words in plant writing that are not someone's name
const KANA_OK = new Set(["アンスリウム", "ハイブリッド", "クローン", "ナーセリー", "コレクター", "タイプ", "ラベル",
  "セクション", "ベルベット", "マーケット", "ショップ", "オークション", "インスタグラム", "メリクロン", "ティッシュカルチャー",
  "シードリング", "ナンバー", "コレクション", "ブリーダー", "ファーム", "グリーンハウス", "フォーム", "サイズ", "カラー",
  "ストック", "オリジナル", "リスト", "ルート", "グループ", "タイプ産地", "フィロデンドロン", "モンステラ", "アロイド"]);

// flags for the owner: names that did not come through as written, Japanese left in an English translation,
// and katakana in a Japanese translation that the original did not have (a name turned into katakana)
export function checkTranslation(source, translation, dst) {
  const src = norm(source), tr = norm(translation);
  const flags = [];
  const missing = requiredNames(src).filter((n) => tr.indexOf(n) === -1);
  if (missing.length) flags.push({ kind: "name_changed", items: missing });
  if (dst === "en" && hasJapanese(tr)) flags.push({ kind: "japanese_left", items: (tr.match(/[぀-ヿ㐀-鿿]+/g) || []).slice(0, 5) });
  if (dst === "ja") {
    const kana = (tr.match(KANA_RUN_RE) || []).filter((k) => src.indexOf(k) === -1 && !KANA_OK.has(k));
    const uniq = kana.filter((k, i) => kana.indexOf(k) === i);
    if (uniq.length) flags.push({ kind: "new_katakana", items: uniq.slice(0, 8) });
  }
  if (!tr.trim()) flags.push({ kind: "empty", items: [] });
  return flags;
}

// the model's reply as JSON; a reply wrapped in a code fence or with words around it still counts
export function parseReply(text) {
  const s = String(text || "");
  const start = s.indexOf("{"), end = s.lastIndexOf("}");
  if (start < 0 || end <= start) throw new Error("no JSON in the reply");
  const o = JSON.parse(s.slice(start, end + 1));
  const translation = String(o.translation || "").trim();
  if (!translation) throw new Error("empty translation");
  return {
    translation,
    romanized: Array.isArray(o.romanized) ? o.romanized.filter((r) => r && r.from && r.to).slice(0, 20) : [],
    unsure: Array.isArray(o.unsure_names) ? o.unsure_names.map(String).filter(Boolean).slice(0, 20) : [],
    note: String(o.note || "").slice(0, 300),
  };
}
