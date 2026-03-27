import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// ============================================================
// Source Trust Tier Definitions (revised)
// ============================================================
const TIER_CONFIG: Record<string, { base_min: number; base_max: number; label_en: string; label_jp: string }> = {
  S: { base_min: 90, base_max: 100, label_en: "IPNI / POWO (Kew)", label_jp: "IPNI / POWO（キュー王立植物園）" },
  A: { base_min: 75, base_max: 90,  label_en: "Academic Paper / Taxonomic Journal", label_jp: "学術論文・分類学ジャーナル" },
  B: { base_min: 55, base_max: 75,  label_en: "Horticultural Books / Society Publications", label_jp: "園芸書籍・学会資料" },
  C: { base_min: 35, base_max: 55,  label_en: "Community / Collector Information", label_jp: "コミュニティ・コレクター情報" },
  D: { base_min: 20, base_max: 35,  label_en: "Unknown / Unverified", label_jp: "不明・未検証" },
};

// ============================================================
// POWO + IPNI: Search and get botanical data
// ============================================================
interface BotanicalResult {
  name: string;
  authors: string;
  fqId: string;
  nativeDistribution: string[];
  publicationYear: string;
  publication: string;
  referenceCollation: string;
  // Type data from IPNI HTML scraping
  collectorTeam: string;
  typeLocality: string;
  typeRemarks: string;
  typeDistribution: string;
}

// Step 1: Search POWO for accepted species
async function searchPOWO(genus: string, species: string): Promise<{ name: string; fqId: string; accepted: boolean } | null> {
  const query = encodeURIComponent(`${genus} ${species}`);
  const url = `https://powo.science.kew.org/api/1/search?q=${query}&perPage=10&cursor=*`;

  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const res = await fetch(url);
      if (res.status === 249 || res.status === 429) {
        console.log(`POWO search rate limited, waiting 5s`);
        await new Promise(r => setTimeout(r, 5000));
        continue;
      }
      if (!res.ok) return null;
      const data = await res.json();
      const results = data?.results || [];

      // Find accepted species matching our query
      const match = results.find((r: any) =>
        r.accepted === true &&
        r.rank === "Species" &&
        r.name?.toLowerCase() === `${genus} ${species}`.toLowerCase()
      );

      if (match) {
        return { name: match.name, fqId: match.fqId, accepted: true };
      }
      // Try any species result
      const any = results.find((r: any) => r.rank === "Species");
      if (any) {
        return { name: any.name, fqId: any.fqId, accepted: any.accepted ?? false };
      }
      return null;
    } catch (e) {
      console.error(`POWO search error:`, e);
      if (attempt < 2) await new Promise(r => setTimeout(r, 2000));
    }
  }
  return null;
}

// Step 2: Get POWO taxon record (author + distribution)
async function lookupPOWO(fqId: string): Promise<{ author: string; distributions: string[] } | null> {
  const url = `https://powo.science.kew.org/api/1/taxon/${fqId}?fields=distribution`;

  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const res = await fetch(url);
      if (res.status === 249 || res.status === 429) {
        await new Promise(r => setTimeout(r, 5000));
        continue;
      }
      if (!res.ok) return null;
      const data = await res.json();

      // POWO taxon returns: { author, scientificName, distributions: [{name, establishment, ...}] }
      const distributions = (data?.distributions || [])
        .filter((d: any) => d.establishment === "Native")
        .map((d: any) => d.name)
        .filter(Boolean);

      return {
        author: data?.author || "",
        distributions,
      };
    } catch (e) {
      console.error(`POWO lookup error:`, e);
      if (attempt < 2) await new Promise(r => setTimeout(r, 2000));
    }
  }
  return null;
}

// Step 3: Try IPNI for publication year/name (supplemental)
async function searchIPNI(genus: string, species: string): Promise<{ year: string; publication: string; collation: string; ipniId: string } | null> {
  const query = encodeURIComponent(`${genus} ${species}`);
  const url = `https://beta.ipni.org/api/1/search?q=${query}&perPage=20&cursor=*`;

  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const data = await res.json();
    const results = data?.results || [];

    // Find species-rank match
    const match = results.find((r: any) =>
      (r.rank === "SPECIES" || r.rank === "spec.") &&
      !r.suppressed &&
      r.genus?.toLowerCase() === genus.toLowerCase() &&
      r.species?.toLowerCase() === species.toLowerCase()
    );

    if (match?.publicationYear) {
      return {
        year: match.publicationYear || "",
        publication: match.publication || "",
        collation: match.referenceCollation || "",
        ipniId: match.id || "",
      };
    }
    return null;
  } catch {
    return null;
  }
}

// Step 4: Scrape IPNI HTML for type specimen data (Collector, Locality, Type Remarks)
interface IpniTypeData {
  collectorTeam: string;
  locality: string;
  typeRemarks: string;
  typeDistribution: string;
}

async function scrapeIpniTypeData(ipniId: string): Promise<IpniTypeData | null> {
  if (!ipniId) return null;
  const url = `https://www.ipni.org/n/${ipniId}`;
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const html = await res.text();

    // Extract <dt>...</dt><dd>...</dd> pairs
    const extractField = (fieldName: string): string => {
      // Match <dt>fieldName</dt><dd>value</dd> (possibly with whitespace/newlines)
      const re = new RegExp(`<dt>${fieldName}</dt>\\s*<dd>([^<]*(?:<[^/][^>]*>[^<]*)*)</dd>`, "i");
      const m = html.match(re);
      if (!m) return "";
      // Strip HTML tags and decode entities
      return m[1]
        .replace(/<br\s*\/?>/gi, ", ")
        .replace(/<[^>]+>/g, "")
        .replace(/&amp;/g, "&")
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
        .replace(/&#x27;/g, "'")
        .replace(/&quot;/g, '"')
        .trim();
    };

    const result: IpniTypeData = {
      collectorTeam: extractField("Collector Team"),
      locality: extractField("Locality"),
      typeRemarks: extractField("Type Remarks"),
      typeDistribution: extractField("Distribution Of Types"),
    };

    const hasData = result.collectorTeam || result.locality || result.typeRemarks;
    if (!hasData) return null;

    console.log(`[IPNI HTML] Type data scraped: collector="${result.collectorTeam}", locality="${result.locality}", remarks="${result.typeRemarks.substring(0, 80)}..."`);
    return result;
  } catch (e) {
    console.log(`[IPNI HTML] Scrape failed:`, String(e));
    return null;
  }
}

// Combined: get all botanical data for a species
async function queryBotanicalDBs(genus: string, species: string): Promise<BotanicalResult | null> {
  console.log(`[DB] Searching POWO for ${genus} ${species}...`);
  const powoSearch = await searchPOWO(genus, species);
  if (!powoSearch) {
    console.log(`[DB] POWO search: no results`);
    return null;
  }
  console.log(`[DB] POWO found: ${powoSearch.name} (fqId: ${powoSearch.fqId})`);

  const powoTaxon = await lookupPOWO(powoSearch.fqId);
  if (!powoTaxon) {
    console.log(`[DB] POWO taxon lookup failed`);
    return null;
  }
  console.log(`[DB] POWO author: ${powoTaxon.author}, distribution: ${powoTaxon.distributions.join(", ")}`);

  // Try IPNI for publication details
  const ipni = await searchIPNI(genus, species);
  if (ipni) {
    console.log(`[DB] IPNI found: ${ipni.year} ${ipni.publication} ${ipni.collation} (id: ${ipni.ipniId})`);
  }

  // Scrape IPNI HTML for type specimen data (Collector, Locality, Type Remarks)
  let typeData: IpniTypeData | null = null;
  if (ipni?.ipniId) {
    typeData = await scrapeIpniTypeData(ipni.ipniId);
  }

  return {
    name: powoSearch.name,
    authors: powoTaxon.author,
    fqId: powoSearch.fqId,
    nativeDistribution: powoTaxon.distributions,
    publicationYear: ipni?.year || "",
    publication: ipni?.publication || "",
    referenceCollation: ipni?.collation || "",
    collectorTeam: typeData?.collectorTeam || "",
    typeLocality: typeData?.locality || "",
    typeRemarks: typeData?.typeRemarks || "",
    typeDistribution: typeData?.typeDistribution || "",
  };
}

// ============================================================
// Wikidata SPARQL: Search for cultivar/hybrid data
// ============================================================
interface WikidataResult {
  parentage: string | null;
  breeder: string | null;
  year: number | null;
  country: string | null;
  description: string | null;
  wikidataUrl: string;
}

async function queryWikidata(genus: string, epithet: string): Promise<WikidataResult | null> {
  try {
    // Search by label containing the cultivar epithet within the genus
    const sparql = `
SELECT ?item ?itemLabel ?itemDescription ?parentTaxon ?parentTaxonLabel
       ?creator ?creatorLabel ?inception ?country ?countryLabel WHERE {
  {
    ?item rdfs:label ?label .
    FILTER(LANG(?label) = "en")
    FILTER(CONTAINS(LCASE(?label), "${epithet.toLowerCase()}"))
    FILTER(CONTAINS(LCASE(?label), "${genus.toLowerCase()}"))
  }
  OPTIONAL { ?item wdt:P171 ?parentTaxon }
  OPTIONAL { ?item wdt:P61 ?creator }
  OPTIONAL { ?item wdt:P575 ?inception }
  OPTIONAL { ?item wdt:P17 ?country }
  SERVICE wikibase:label { bd:serviceParam wikibase:language "en,ja" }
} LIMIT 5`;

    const url = `https://query.wikidata.org/sparql?query=${encodeURIComponent(sparql)}&format=json`;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);

    const res = await fetch(url, {
      headers: { "Accept": "application/json", "User-Agent": "PlantStoryBot/1.0" },
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (!res.ok) {
      console.log(`[Wikidata] HTTP ${res.status}`);
      return null;
    }

    const data = await res.json();
    const bindings = data?.results?.bindings || [];
    if (bindings.length === 0) {
      console.log(`[Wikidata] No results for ${genus} ${epithet}`);
      return null;
    }

    const first = bindings[0];
    const itemUri = first.item?.value || "";
    const wikidataId = itemUri.split("/").pop() || "";

    // Try to extract parentage from multiple results (parent taxa)
    const parentLabels = bindings
      .map((b: any) => b.parentTaxonLabel?.value)
      .filter((v: string | undefined) => v && v !== wikidataId);
    const uniqueParents = [...new Set(parentLabels)];
    let parentage: string | null = null;
    if (uniqueParents.length >= 2) {
      parentage = `${uniqueParents[0]} × ${uniqueParents[1]}`;
    } else if (uniqueParents.length === 1) {
      parentage = uniqueParents[0];
    }

    const result: WikidataResult = {
      parentage,
      breeder: first.creatorLabel?.value || null,
      year: first.inception?.value ? new Date(first.inception.value).getFullYear() : null,
      country: first.countryLabel?.value || null,
      description: first.itemDescription?.value || null,
      wikidataUrl: itemUri,
    };

    console.log(`[Wikidata] Found: parentage=${result.parentage}, breeder=${result.breeder}, year=${result.year}`);
    return result;
  } catch (e) {
    if (e instanceof DOMException && e.name === "AbortError") {
      console.log("[Wikidata] Timeout (5s)");
    } else {
      console.log("[Wikidata] Error:", String(e));
    }
    return null;
  }
}

// ============================================================
// CrossRef: Search for academic papers about cultivar
// ============================================================
interface CrossRefResult {
  title: string;
  authors: string[];
  year: number;
  journal: string;
  doi: string;
}

async function searchCrossRef(genus: string, epithet: string): Promise<CrossRefResult[]> {
  try {
    const query = encodeURIComponent(`${genus} ${epithet}`);
    const url = `https://api.crossref.org/works?query=${query}&rows=10&select=title,author,published-print,container-title,DOI`;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);

    const res = await fetch(url, {
      headers: { "User-Agent": "PlantStoryBot/1.0 (mailto:plants-story@example.com)" },
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (!res.ok) {
      console.log(`[CrossRef] HTTP ${res.status}`);
      return [];
    }

    const data = await res.json();
    const items = data?.message?.items || [];

    // Relevant journal names for Araceae research
    const relevantJournals = [
      "aroideana", "phytotaxa", "willdenowia", "taxon", "botanical journal",
      "kew bulletin", "annals of botany", "plant systematics", "systematic botany",
      "novon", "nordic journal of botany", "blumea", "gardens' bulletin",
      "horticulturae", "hortscience", "scientia horticulturae", "plant cell",
      "tissue and organ culture", "in vitro cellular", "propagation of ornamental",
      "journal of the american society for horticultural science", "plant science",
      "international journal of molecular sciences", "plants", "frontiers in plant",
    ];

    const results: CrossRefResult[] = [];
    for (const item of items) {
      const title = (item.title?.[0] || "").toLowerCase();
      const journal = (item["container-title"]?.[0] || "").toLowerCase();

      // Filter: title must mention the genus or epithet
      const titleRelevant = title.includes(genus.toLowerCase()) || title.includes(epithet.toLowerCase());
      const journalRelevant = relevantJournals.some(j => journal.includes(j));
      // Accept if: (title relevant AND journal relevant) OR (title contains BOTH genus AND epithet)
      const titleStrong = title.includes(genus.toLowerCase()) && title.includes(epithet.toLowerCase());

      if ((titleRelevant && journalRelevant) || titleStrong) {
        const authors = (item.author || []).map((a: any) =>
          `${a.given || ""} ${a.family || ""}`.trim()
        );
        const year = item["published-print"]?.["date-parts"]?.[0]?.[0] || 0;

        results.push({
          title: item.title?.[0] || "",
          authors,
          year,
          journal: item["container-title"]?.[0] || "",
          doi: item.DOI || "",
        });
      }
    }

    console.log(`[CrossRef] Found ${results.length} relevant papers for ${genus} ${epithet}`);
    return results.slice(0, 3); // Top 3 most relevant
  } catch (e) {
    if (e instanceof DOMException && e.name === "AbortError") {
      console.log("[CrossRef] Timeout (5s)");
    } else {
      console.log("[CrossRef] Error:", String(e));
    }
    return [];
  }
}

// ============================================================
// Gather external data in parallel
// ============================================================
interface ExternalData {
  wikidata: WikidataResult | null;
  papers: CrossRefResult[];
}

async function gatherExternalData(genus: string, epithet: string): Promise<ExternalData> {
  const [wikidata, papers] = await Promise.all([
    queryWikidata(genus, epithet),
    searchCrossRef(genus, epithet),
  ]);
  return { wikidata, papers };
}

// ============================================================
// Build external data context block for LLM prompts
// ============================================================
function buildExternalDataContext(ext: ExternalData): string {
  const sections: string[] = [];

  if (ext.wikidata) {
    const wd = ext.wikidata;
    let wdInfo = `[Wikidata] ${wd.wikidataUrl}`;
    if (wd.parentage) wdInfo += `\n  Parentage: ${wd.parentage}`;
    if (wd.breeder) wdInfo += `\n  Creator/Breeder: ${wd.breeder}`;
    if (wd.year) wdInfo += `\n  Year: ${wd.year}`;
    if (wd.country) wdInfo += `\n  Country of origin: ${wd.country}`;
    if (wd.description) wdInfo += `\n  Description: ${wd.description}`;
    sections.push(wdInfo);
  }

  if (ext.papers.length > 0) {
    const paperLines = ext.papers.map((p, i) =>
      `  ${i + 1}. "${p.title}" by ${p.authors.join(", ")} (${p.year}) in ${p.journal}. DOI: ${p.doi}`
    );
    sections.push(`[Academic Papers]\n${paperLines.join("\n")}`);
  }

  if (sections.length === 0) {
    return "";
  }

  return `\n=== EXTERNAL DATABASE RESULTS (verified data — do NOT contradict) ===\n${sections.join("\n\n")}\n`;
}

// ============================================================
// Helper: Call Gemini API
// ============================================================
async function callGemini(apiKey: string, prompt: string, maxTokens = 2048) {
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.15, maxOutputTokens: maxTokens },
      }),
    }
  );
  const data = await response.json();
  if (data?.error) {
    throw new Error(data.error.message || "Gemini API error");
  }
  return data?.candidates?.[0]?.content?.parts?.[0]?.text || "";
}

// ============================================================
// Helper: Call Groq API (fallback)
// ============================================================
async function callGroq(
  apiKey: string,
  model: string,
  systemPrompt: string,
  userPrompt: string,
  maxTokens = 2048
) {
  const response = await fetch(
    "https://api.groq.com/openai/v1/chat/completions",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.15,
        max_tokens: maxTokens,
      }),
    }
  );
  const data = await response.json();
  return data?.choices?.[0]?.message?.content || "";
}

// ============================================================
// Helper: Call OpenAI API (GPT-4o mini fallback)
// ============================================================
async function callOpenAI(
  apiKey: string,
  systemPrompt: string,
  userPrompt: string,
  maxTokens = 2048
) {
  const response = await fetch(
    "https://api.openai.com/v1/chat/completions",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.15,
        max_tokens: maxTokens,
      }),
    }
  );
  const data = await response.json();
  if (data?.error) {
    throw new Error(data.error.message || "OpenAI API error");
  }
  return data?.choices?.[0]?.message?.content || "";
}

// ============================================================
// Helper: Extract JSON from text
// ============================================================
function extractJson(text: string) {
  const match = text.match(/\{[\s\S]*\}/);
  if (match) {
    return JSON.parse(match[0]);
  }
  return null;
}

// ============================================================
// Parse species name from cultivar_name
// e.g., "Monstera deliciosa 'Thai Constellation'" -> { genus: "Monstera", species: "deliciosa" }
// e.g., "Anthurium crystallinum" -> { genus: "Anthurium", species: "crystallinum" }
// ============================================================
function parseSpeciesName(cultivarName: string): { genus: string; species: string | null } {
  // Remove cultivar epithet in quotes
  const cleaned = cultivarName.replace(/'[^']+'/g, "").trim();
  const parts = cleaned.split(/\s+/);
  return {
    genus: parts[0] || "",
    species: parts.length >= 2 ? parts[1] : null,
  };
}

// ============================================================
// Build description from IPNI/POWO data (species only)
// ============================================================
function buildSpeciesStructuredPrompt(bot: BotanicalResult): string {
  const distribution = bot.nativeDistribution.join(", ") || "不明";

  // Include IPNI type data if available
  let typeDataSection = "";
  if (bot.collectorTeam || bot.typeLocality || bot.typeRemarks) {
    typeDataSection = `\n=== TYPE SPECIMEN DATA (from IPNI — use this as PRIMARY source) ===`;
    if (bot.collectorTeam) typeDataSection += `\nCollector Team: ${bot.collectorTeam}`;
    if (bot.typeLocality) typeDataSection += `\nLocality: ${bot.typeLocality}`;
    if (bot.typeRemarks) typeDataSection += `\nType Remarks: ${bot.typeRemarks}`;
    if (bot.typeDistribution) typeDataSection += `\nDistribution Of Types: ${bot.typeDistribution}`;
    typeDataSection += "\n";
  }

  return `You are a botanical researcher extracting structured data about a plant species.
You are given VERIFIED data from IPNI and POWO (Kew Gardens). Your task is to supplement this with additional structured information from RELIABLE academic sources only.

=== ALREADY KNOWN (from IPNI/POWO — do NOT repeat in notes) ===
Scientific name: ${bot.name}
Authors: ${bot.authors}
Publication year: ${bot.publicationYear || "unknown"}
Publication: ${bot.publication || "unknown"} ${bot.referenceCollation || ""}
Family: Araceae
Native distribution: ${distribution}
${typeDataSection}
=== YOUR TASK ===
Research and return structured data about this species. Use ONLY:
- Peer-reviewed academic papers (Aroideana, Phytotaxa, Annals of the Missouri Botanical Garden, etc.)
- Official botanical databases (IPNI, POWO, Tropicos, GBIF, botanical garden specimen records)
- Taxonomic monographs and revisions

NEVER use: nursery pages, Instagram, Reddit, Facebook, blogs, Yahoo Auctions, Mercari.

=== CRITICAL RULES ===
1. You MUST actively use your training knowledge of botanical literature (protologues, monographs, taxonomic revisions like Croat's Anthurium revisions, Aroideana papers, etc.) to fill in collector and type_locality. This is citing published science, NOT guessing.
2. "不明" is a LAST RESORT — only use it when you are certain no published record exists for that field. If the species was described by a known taxonomist (e.g., Croat, Engler, Schott), protologues almost always contain collector and locality data — look it up.
3. NEVER use unverified internet sources (nursery pages, social media, blogs).
4. collector = the person who FIRST COLLECTED the type specimen.
   Priority: (a) "Collector Team" from TYPE SPECIMEN DATA above, (b) your knowledge of the protologue/original description, (c) the describing author if they also collected the type.
   Parse the collector name from the collector number (e.g., "T. B. Croat 94069" → "T. B. Croat").
5. type_locality = the specific location where the type specimen was collected.
   Priority: (a) "Locality" from TYPE SPECIMEN DATA above, (b) Type Remarks, (c) your knowledge of the protologue, (d) the native distribution region.
   Be as specific as possible (department/province, country, elevation if known).
6. Do NOT include specific size measurements in notes (plants vary by growing conditions).
7. notes should describe the plant's APPEARANCE: leaf shape, color, texture, venation pattern, petiole characteristics. Keep it engaging for plant enthusiasts.

=== MANDATORY WRITING RULES FOR JAPANESE TEXT ===
CRITICAL: In ALL Japanese text fields (notes, known_habitats, collector, type_locality, etc.), the following MUST be written in Latin/English alphabet. NEVER transliterate to katakana:
- Species/cultivar names: Use Latin scientific names ONLY. Write "Anthurium crystallinum", NEVER "アンスリウム・クリスタリナム" or any katakana.
- Person names: Use English alphabet ONLY. Write "T. B. Croat", NEVER "クロート".
- Place/region names: Use English alphabet ONLY. Write "Colombia", NEVER "コロンビア".

=== OUTPUT FORMAT ===
Return ONLY valid JSON (no markdown, no code blocks):
{
  "collector": "採取者名 — English only. Example: T. B. Croat. 不明なら \"不明\"",
  "collection_year": "採取年 (number or null, 不明ならnull)",
  "type_locality": "タイプ産地 — English only. Example: Chocó, Colombia. 不明なら \"不明\"",
  "notes": "日本語の補足テキスト (100-200文字)。植物の外見的特徴（葉の形状・色・質感・葉脈パターン等）を記述。人名・種名・地名は英語アルファベットで記載。",
  "notes_en": "English supplementary text (80-150 words). Describe appearance: leaf shape, color, texture, venation, petiole."
}`;
}

// ============================================================
// Build structured extraction prompt for clone/hybrid/seedling
// ============================================================
function buildCultivarStructuredPrompt(
  cultivarName: string,
  genus: string,
  plantType: string,
  userText: string,
  verifyResult: any
): string {
  const claimsContext = (verifyResult?.claims_verified || [])
    .filter((c: any) => c.status === "verified" || c.status === "partially_verified")
    .map((c: any) => `- ${c.claim} (${c.status}, source: ${c.source || "N/A"})`)
    .join("\n");

  const foundSourcesContext = (verifyResult?.found_sources || [])
    .map((s: any) => `- ${s.label}: ${s.url}`)
    .join("\n");

  const typeFields = plantType === "clone"
    ? `"namer": "この品種に名前をつけた人物 (string, 不明なら \\"不明\\")",
  "naming_year": "命名された年 (number or null, 不明ならnull)",`
    : plantType === "seedling"
    ? `"breeder": "作出者 (string, 不明なら \\"不明\\")",
  "sowing_date": "播種日 (string YYYY-MM-DD or null, 不明ならnull)",`
    : `"breeder": "作出者 / ナーセリー (string, 不明なら \\"不明\\")",
  "naming_year": "命名された年 (number or null, 不明ならnull)",`;

  return `You are a botanical researcher extracting STRUCTURED data about the ${plantType} cultivar "${cultivarName}" (genus: ${genus}).

=== USER'S DESCRIPTION ===
${userText}

=== VERIFIED CLAIMS ===
${claimsContext || "(none)"}

=== FOUND SOURCES ===
${foundSourcesContext || "(none)"}

=== YOUR TASK ===
Extract structured fields from the user's description and verified claims above.
Use ONLY information that is verified or directly stated in the user text. Do NOT speculate.

=== CRITICAL RULES ===
1. Use verified claims and user text to fill fields. Only write "不明" or null when NO information exists.
2. NEVER write "believed to be", "possibly", "likely".
3. formula.parentA and formula.parentB should be the parent cultivar names (e.g., "A. crystallinum", "A. magnificum").
4. notes should be a 1-2 sentence summary of key facts about this cultivar in Japanese.

=== MANDATORY WRITING RULES FOR JAPANESE TEXT ===
CRITICAL: In ALL Japanese text fields, the following MUST be written in Latin/English alphabet. NEVER transliterate to katakana:
- Species/cultivar names: Use Latin scientific names ONLY. Write "Anthurium crystallinum", NEVER katakana.
- Person names: Use English alphabet ONLY. Write "John Banta", NEVER katakana.
- Place/region names: Use English alphabet ONLY. Write "Florida", NEVER katakana.

=== OUTPUT FORMAT ===
Return ONLY valid JSON (no markdown, no code blocks):
{
  ${typeFields}
  "formula": {
    "parentA": "片親A (string or empty, 不明なら \\"\\")",
    "parentB": "片親B (string or empty, 不明なら \\"\\")"
  },
  "notes": "日本語の補足テキスト (50-150文字). 人名・種名・地名はカタカナを使わず英語アルファベットで記載",
  "notes_en": "English supplementary text (30-80 words)"
}`;
}

// ============================================================
// Build research prompt for cultivars/hybrids (improved)
// ============================================================
function buildCultivarResearchPrompt(cultivarName: string, genus: string, type: string): string {
  return `You are a botanical taxonomist researching the origin of "${cultivarName}" (genus: ${genus}, type: ${type}).

=== CRITICAL RULES — VIOLATIONS WILL INVALIDATE YOUR RESPONSE ===

1. Use information from academic papers, monographs, and botanical databases you know from training data. Citing published data is encouraged — this is NOT guessing.
   Only write null when NO published source exists.
   NEVER write "believed to be", "thought to be", "possibly", "likely", "speculated", "assumed", or "presumed".

2. NEVER attribute creation to plant SELLERS or NURSERIES unless they are the
   VERIFIED original breeder with published evidence. These are SELLERS, not creators:
   NSE Tropicals, Ecuagenera, LCA Plants, Aroid Greenhouses, Gabriella Plants,
   Peace Love Happiness Club, Steve's Leaves, Logee's, etc.

3. DISTINGUISH original description from taxonomic revision:
   - Original description = first formal publication of the name (basionym)
   - Taxonomic revision = later re-classification (NOT the discovery)
   - Croat & Grayum 1997, Croat & Baker 2005, etc. are REVISIONS for most Araceae.
     Do NOT cite these as original descriptions unless they actually created the name.

4. SOURCE PRIORITY (strict order):
   a. Peer-reviewed academic papers (Aroideana, Phytotaxa, etc.)
   b. International Aroid Society publications
   c. Verified breeder records with published evidence
   d. NOTHING ELSE is reliable for factual claims about origin.

5. NEVER use information from: nursery product pages, Instagram, Reddit,
   Facebook groups, Japanese blogs, Yahoo Auctions JP, Mercari JP.

6. If a cultivar was formally described as a species (e.g., trade name "El Choco Red"
   = Philodendron rubrijuvenile Croat & Kaufmann 2022), cite the formal description.

=== OUTPUT FORMAT ===
Return ONLY valid JSON (no markdown):
{
  "origins": [
    {
      "source_tier": "A | B | C | D",
      "source_name": "Name of source",
      "source_url": "URL or empty string",
      "description_en": "Factual English description (100-250 words). WHO did WHAT, WHEN, WHERE.",
      "description_jp": "日本語の完全な説明文 (100-250文字)。学名・人名・地名は英語のまま。",
      "parentage": "Parent A × Parent B (or null if unknown)",
      "discovery_year": null,
      "discoverer_or_breeder": "Name or null",
      "native_region": "Specific region or null",
      "first_description": "Author & publication or null",
      "confidence": 0.0
    }
  ],
  "cultivar_summary_en": "One-sentence factual summary",
  "cultivar_summary_jp": "事実の一文要約"
}

=== RULES ===
- Return 1 origin only. Quality over quantity.
- confidence: YOUR confidence this info is accurate (0.0-1.0). Be honest.
- If you truly cannot find reliable info, return confidence: 0.2 with tier "D".
- description_jp MUST be a complete Japanese paragraph, not a stub.

=== WRITING STYLE ===
- Write for plant enthusiasts, not scientists. Keep it readable and engaging.
- Even if origin is UNKNOWN, describe the plant's APPEARANCE (leaf shape, color, variegation pattern, growth habit) so the reader learns something useful.
- Do NOT include specific size measurements (e.g., "30-40cm", "1m tall"). Sizes vary greatly between individuals depending on growing conditions.
- For unknown origins, be CONCISE: "由来は不明。" then describe the plant itself.
- Do NOT write long apologies about lack of information. Just state it briefly and move on to describing the plant.
- 日本語: 自然で読みやすい文章。「信頼できる情報源が見つからなかったため…」のような冗長な表現は避ける。

=== MANDATORY WRITING RULES FOR JAPANESE TEXT ===
CRITICAL: In ALL Japanese text fields, the following MUST be written in Latin/English alphabet. NEVER transliterate to katakana:
- Species/cultivar names: Use Latin scientific names ONLY. Write "Anthurium luxurians", NEVER katakana.
- Person names: Use English alphabet ONLY. Write "T. B. Croat", NEVER katakana.
- Place/region names: Use English alphabet ONLY. Write "Colombia", NEVER katakana.`;
}

// ============================================================
// Build enhanced research prompt for Hybrid (with external data)
// ============================================================
function buildHybridResearchPrompt(cultivarName: string, genus: string, ext: ExternalData): string {
  const externalContext = buildExternalDataContext(ext);
  const hasExternalData = externalContext.length > 0;

  return `You are a botanical taxonomist researching the origin of the HYBRID cultivar "${cultivarName}" (genus: ${genus}).
${externalContext}
=== CRITICAL RULES — VIOLATIONS WILL INVALIDATE YOUR RESPONSE ===

1. Use information from academic papers, monographs, patents, and botanical databases you know from training data. Citing published data is encouraged — this is NOT guessing.
   Only write null when NO published source exists.
   NEVER write "believed to be", "thought to be", "possibly", "likely", "speculated", "assumed", or "presumed".

2. NEVER attribute creation to plant SELLERS or NURSERIES unless they are the
   VERIFIED original breeder with published evidence. These are SELLERS, not creators:
   NSE Tropicals, Ecuagenera, LCA Plants, Aroid Greenhouses, Gabriella Plants,
   Peace Love Happiness Club, Steve's Leaves, Logee's, etc.

3. SOURCE PRIORITY (strict order):
   a. External database results shown above (if any) — HIGHEST PRIORITY, do NOT contradict
   b. Peer-reviewed academic papers (Aroideana, Phytotaxa, etc.)
   c. International Aroid Society publications
   d. Verified breeder records with published evidence
   e. NOTHING ELSE is reliable for factual claims about origin.

4. NEVER use information from: nursery product pages, Instagram, Reddit,
   Facebook groups, Japanese blogs, Yahoo Auctions JP, Mercari JP.

=== HYBRID-SPECIFIC GUIDELINES ===
- Focus on PARENTAGE (Parent A × Parent B) — this is the most important info for hybrids.
- If external data confirms parentage, USE IT and cite the source.
- Identify the BREEDER if known (who created this cross).
- Note when the cross was first made or registered.
- Describe the hybrid's distinctive features compared to its parents.
${hasExternalData ? "- The external data above has been verified from databases. Incorporate it into your description." : "- No external data was found. Research from your training data only, following strict rules above."}

=== OUTPUT FORMAT ===
Return ONLY valid JSON (no markdown):
{
  "origins": [
    {
      "source_tier": "${hasExternalData ? "B" : "C"} | adjust based on your confidence",
      "source_name": "Name of source",
      "source_url": "URL or empty string",
      "description_en": "Factual English description (100-250 words). Focus on parentage, breeder, and distinctive features.",
      "description_jp": "日本語の完全な説明文 (100-250文字)。交配親・作出者・特徴に焦点。学名・人名・地名は英語のまま。",
      "parentage": "Parent A × Parent B (or null if unknown)",
      "discovery_year": null,
      "discoverer_or_breeder": "Name or null",
      "native_region": null,
      "first_description": "Author & publication or null",
      "confidence": 0.0
    }
  ],
  "cultivar_summary_en": "One-sentence factual summary",
  "cultivar_summary_jp": "事実の一文要約"
}

=== RULES ===
- Return 1 origin only. Quality over quantity.
- confidence: YOUR confidence this info is accurate (0.0-1.0). Be honest.
${hasExternalData ? "- External data was found: set confidence higher (0.5-0.9) if it corroborates your knowledge." : "- No external data found: be conservative with confidence."}
- If you truly cannot find reliable info, return confidence: 0.2 with tier "D".
- description_jp MUST be a complete Japanese paragraph, not a stub.

=== WRITING STYLE ===
- Write for plant enthusiasts, not scientists. Keep it readable and engaging.
- Even if origin is UNKNOWN, describe the plant's APPEARANCE (leaf shape, color, variegation pattern, growth habit).
- Do NOT include specific size measurements. Sizes vary greatly between individuals.
- For unknown origins, be CONCISE: "由来は不明。" then describe the plant itself.
- 日本語: 自然で読みやすい文章。冗長な表現は避ける。

=== MANDATORY WRITING RULES FOR JAPANESE TEXT ===
CRITICAL: In ALL Japanese text fields, the following MUST be written in Latin/English alphabet. NEVER transliterate to katakana:
- Species/cultivar names: Use Latin scientific names ONLY. Write "Anthurium crystallinum", NEVER katakana.
- Person names: Use English alphabet ONLY. Write "John Banta", NEVER katakana.
- Place/region names: Use English alphabet ONLY. Write "Florida", NEVER katakana.`;
}

// ============================================================
// Build enhanced research prompt for Clone (with external data)
// ============================================================
function buildCloneResearchPrompt(cultivarName: string, genus: string, ext: ExternalData): string {
  const externalContext = buildExternalDataContext(ext);
  const hasExternalData = externalContext.length > 0;

  return `You are a botanical taxonomist researching the origin of the CLONE cultivar "${cultivarName}" (genus: ${genus}).
A "clone" is a vegetatively propagated selection — a specific individual chosen for unique traits (variegation, color, leaf shape).
${externalContext}
=== CRITICAL RULES — VIOLATIONS WILL INVALIDATE YOUR RESPONSE ===

1. Use information from academic papers, patents, monographs, and botanical databases you know from training data. Citing published data is encouraged — this is NOT guessing.
   Only write null when NO published source exists.
   NEVER write "believed to be", "thought to be", "possibly", "likely", "speculated", "assumed", or "presumed".

2. NEVER attribute discovery to plant SELLERS or NURSERIES unless they are the
   VERIFIED original selector/discoverer with published evidence. These are SELLERS, not discoverers:
   NSE Tropicals, Ecuagenera, LCA Plants, Aroid Greenhouses, Gabriella Plants,
   Peace Love Happiness Club, Steve's Leaves, Logee's, etc.

3. SOURCE PRIORITY (strict order):
   a. External database results shown above (if any) — HIGHEST PRIORITY, do NOT contradict
   b. Plant patent records (USPTO USPP) — very reliable for clones
   c. Peer-reviewed academic papers (Aroideana, Phytotaxa, etc.)
   d. Tissue culture laboratory records with published evidence
   e. NOTHING ELSE is reliable for factual claims about origin.

4. NEVER use information from: nursery product pages, Instagram, Reddit,
   Facebook groups, Japanese blogs, Yahoo Auctions JP, Mercari JP.

=== CLONE-SPECIFIC GUIDELINES ===
- Focus on ORIGIN STORY: How was this clone discovered or selected?
- Was it a natural mutation (sport), tissue culture mutation, or deliberate selection?
- If it has a plant patent (USPP), cite the patent number and inventor.
- Who discovered or first propagated this clone?
- What makes this clone DISTINCT from the typical species form?
- If it originated from tissue culture (e.g., Thai Constellation), note the laboratory/company.
${hasExternalData ? "- The external data above has been verified from databases. Incorporate it into your description." : "- No external data was found. Research from your training data only, following strict rules above."}

=== OUTPUT FORMAT ===
Return ONLY valid JSON (no markdown):
{
  "origins": [
    {
      "source_tier": "${hasExternalData ? "B" : "C"} | adjust based on your confidence",
      "source_name": "Name of source",
      "source_url": "URL or empty string",
      "description_en": "Factual English description (100-250 words). Focus on origin story, discoverer, and distinguishing traits.",
      "description_jp": "日本語の完全な説明文 (100-250文字)。発見経緯・特徴に焦点。学名・人名・地名は英語のまま。",
      "parentage": "Parent species or null",
      "discovery_year": null,
      "discoverer_or_breeder": "Name or null",
      "native_region": "Where discovered or null",
      "first_description": "Patent number or publication or null",
      "confidence": 0.0
    }
  ],
  "cultivar_summary_en": "One-sentence factual summary",
  "cultivar_summary_jp": "事実の一文要約"
}

=== RULES ===
- Return 1 origin only. Quality over quantity.
- confidence: YOUR confidence this info is accurate (0.0-1.0). Be honest.
${hasExternalData ? "- External data was found: set confidence higher (0.5-0.9) if it corroborates your knowledge." : "- No external data found: be conservative with confidence."}
- If you truly cannot find reliable info, return confidence: 0.2 with tier "D".
- description_jp MUST be a complete Japanese paragraph, not a stub.

=== WRITING STYLE ===
- Write for plant enthusiasts, not scientists. Keep it readable and engaging.
- Even if origin is UNKNOWN, describe the clone's APPEARANCE (leaf shape, color, variegation pattern, growth habit).
- Do NOT include specific size measurements. Sizes vary greatly between individuals.
- For unknown origins, be CONCISE: "由来は不明。" then describe the plant itself.
- 日本語: 自然で読みやすい文章。冗長な表現は避ける。

=== MANDATORY WRITING RULES FOR JAPANESE TEXT ===
CRITICAL: In ALL Japanese text fields, the following MUST be written in Latin/English alphabet. NEVER transliterate to katakana:
- Species/cultivar names: Use Latin scientific names ONLY. Write "Anthurium crystallinum", NEVER katakana.
- Person names: Use English alphabet ONLY. Write "John Banta", NEVER katakana.
- Place/region names: Use English alphabet ONLY. Write "Florida", NEVER katakana.`;
}

// ============================================================
// Build verification prompt for user-written CLONE/Hybrid origins
// ============================================================
function buildVerificationPrompt(
  cultivarName: string,
  genus: string,
  plantType: string,
  userText: string,
  userSources: string[],
  ext: ExternalData
): string {
  const externalContext = buildExternalDataContext(ext);
  const sourcesBlock = userSources.length > 0
    ? `\n=== USER-PROVIDED SOURCE LINKS ===\n${userSources.map((u, i) => `${i + 1}. ${u}`).join("\n")}\n`
    : "\n(No source links provided by user)\n";

  return `You are a botanical FACT-CHECKER verifying a user-written description of the ${plantType} cultivar "${cultivarName}" (genus: ${genus}).

=== USER'S DESCRIPTION ===
${userText}
${sourcesBlock}${externalContext}
=== YOUR TASK ===
Cross-reference the user's claims against the external database results above and your own knowledge.
Extract each factual claim from the user's text and determine if it can be verified.

=== CRITICAL RULES ===
1. Do NOT rewrite, improve, or modify the user's text. You are ONLY evaluating accuracy.
2. Be fair: "unverifiable" does NOT mean "false". Community knowledge that cannot be formally confirmed should be rated honestly.
3. If external data confirms a claim, cite the specific source.
4. If external data contradicts a claim, flag it as a warning with the correct information.
5. Include any reliable sources you discover during verification in found_sources.

=== SOURCE RELIABILITY RANKING ===
- academic: Peer-reviewed papers, taxonomic journals (Aroideana, Phytotaxa, etc.) → Tier A
- database: Official databases (Wikidata, IPNI, USPTO patents, botanical garden records) → Tier B
- community: Hobbyist publications, collector forums, nursery records with evidence → Tier C
- unverifiable: No corroborating sources found → Tier D

=== OUTPUT FORMAT ===
Return ONLY valid JSON (no markdown):
{
  "verification_tier": "A|B|C|D",
  "confidence": 0.0-1.0,
  "claims_verified": [
    {
      "claim": "short description of the factual claim",
      "status": "verified|partially_verified|unverifiable|contradicted",
      "source": "what source verified or contradicted this (or empty string)"
    }
  ],
  "source_quality": "academic|database|community|unverifiable",
  "found_sources": [
    {
      "url": "https://...",
      "label": "Source name (year)",
      "reliability": "high|medium|low"
    }
  ],
  "verification_summary_jp": "検証結果の1-2文要約（日本語）",
  "verification_summary_en": "1-2 sentence verification summary",
  "warnings": ["Any contradictions or red flags (empty array if none)"]
}

=== TIER ASSIGNMENT RULES ===
- A: Key claims verified by academic papers or patent records
- B: Key claims verified by official databases (Wikidata, institutional records)
- C: Claims match community/collector knowledge but no formal verification
- D: Claims cannot be verified or are contradicted by evidence
- confidence: How confident you are in your verification assessment (0.0-1.0)`;
}

// ============================================================
// Calculate trust from verification result
// ============================================================
function calculateVerificationTrust(
  verificationTier: string,
  confidence: number
): number {
  const tier = verificationTier || "D";
  const tierInfo = TIER_CONFIG[tier] || TIER_CONFIG.D;
  const conf = Math.max(0, Math.min(1, confidence || 0));
  let trust = Math.round(tierInfo.base_min + (tierInfo.base_max - tierInfo.base_min) * conf);
  trust = Math.max(tierInfo.base_min, Math.min(tierInfo.base_max, trust));
  return trust;
}

// ============================================================
// Enhanced trust calculation for external data
// ============================================================
function calculateEnhancedTrust(
  ext: ExternalData,
  aiTier: string,
  aiConfidence: number
): { tier: string; trust: number } {
  // If academic papers found → bump to A tier
  if (ext.papers.length > 0) {
    const tierInfo = TIER_CONFIG.A;
    const trust = Math.round(tierInfo.base_min + (tierInfo.base_max - tierInfo.base_min) * Math.max(aiConfidence, 0.3));
    return { tier: "A", trust: Math.max(tierInfo.base_min, Math.min(tierInfo.base_max, trust)) };
  }

  // If Wikidata has parentage or breeder → bump to B tier minimum
  if (ext.wikidata && (ext.wikidata.parentage || ext.wikidata.breeder)) {
    const effectiveTier = aiTier === "A" ? "A" : "B";
    const tierInfo = TIER_CONFIG[effectiveTier];
    const trust = Math.round(tierInfo.base_min + (tierInfo.base_max - tierInfo.base_min) * Math.max(aiConfidence, 0.4));
    return { tier: effectiveTier, trust: Math.max(tierInfo.base_min, Math.min(tierInfo.base_max, trust)) };
  }

  // No external data → use AI's own tier/confidence (existing logic)
  return { tier: aiTier, trust: -1 }; // -1 signals: use existing calculation
}

// ============================================================
// Main Handler
// ============================================================
serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { cultivar_id, genus, cultivar_name, type, manual_origins, user_text, user_sources, preview } = await req.json();

    if ((!cultivar_id && !preview) || !cultivar_name) {
      return new Response(
        JSON.stringify({ error: "cultivar_id and cultivar_name are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Skip AI research for seedlings
    if (type === "seedling") {
      return new Response(
        JSON.stringify({ success: false, reason: "AI research not applicable for seedlings" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Skip post-registration AI research for species (only allow preview mode for auto-fill button)
    if (type === "species" && !preview) {
      return new Response(
        JSON.stringify({ success: false, reason: "Species uses pre-registration auto-fill only" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const geminiApiKey = Deno.env.get("GEMINI_API_KEY") || "";
    const groqApiKey = Deno.env.get("GROQ_API_KEY") || "";
    const openaiApiKey = Deno.env.get("OPENAI_API_KEY") || "";

    // Preserve manual (user-written) origins
    // Priority: use manual_origins passed directly from frontend (avoids race condition)
    // Fallback: fetch from DB for re-research scenarios (admin "AI再調査" button)
    let manualOrigins: any[] = [];
    if (manual_origins && Array.isArray(manual_origins) && manual_origins.length > 0) {
      manualOrigins = manual_origins;
      console.log(`[Manual] Using ${manualOrigins.length} manual origins passed from frontend`);
    } else if (!preview) {
      const { data: existingRow } = await supabase
        .from("cultivars")
        .select("origins")
        .eq("id", cultivar_id)
        .single();
      manualOrigins = (existingRow?.origins || []).filter(
        (o: any) => o.source_type === "manual" || (o.author && o.author.isAI === false && o.source_type !== "user_verified")
      );
      if (manualOrigins.length > 0) {
        console.log(`[Manual] Preserved ${manualOrigins.length} manual origins from DB`);
      }
    }

    // Update status to researching (skip in preview mode)
    if (!preview) {
      await supabase
        .from("cultivars")
        .update({ ai_status: "researching" })
        .eq("id", cultivar_id);
    }

    const plantType = type || "unknown";
    const parsed = parseSpeciesName(cultivar_name);
    const speciesName = parsed.species;

    let originEntries: any[] = [];
    let researchSource = "unknown";

    // ================================================================
    // ROUTE A: Species → POWO/IPNI direct lookup
    // ================================================================
    if (plantType === "species" && speciesName) {
      console.log(`[Species] Querying botanical DBs for: ${parsed.genus} ${speciesName}`);
      const botResult = await queryBotanicalDBs(parsed.genus, speciesName);

      if (botResult) {
        researchSource = "ipni-powo";

        // AI structured data: collector, collection_year, type_locality, known_habitats, notes
        const structuredPrompt = buildSpeciesStructuredPrompt(botResult);
        let aiStructured: any = null;

        // LLM cascade: Gemini (free) → Groq (free) → GPT-4o mini (paid, last resort)
        if (geminiApiKey) {
          try {
            console.log("[Structured] Trying Gemini...");
            const text = await callGemini(geminiApiKey, structuredPrompt);
            console.log("[Structured] Gemini raw length:", text?.length, "first 100:", text?.substring(0, 100));
            const parsed = extractJson(text);
            if (parsed?.notes) {
              aiStructured = parsed;
              console.log("[Structured] Gemini OK");
            }
          } catch (e) {
            console.log("[Structured] Gemini FAILED:", String(e));
          }
        }

        if (!aiStructured && groqApiKey) {
          try {
            console.log("[Structured] Trying Groq...");
            const text = await callGroq(
              groqApiKey, "llama-3.3-70b-versatile",
              "You are a botanical researcher. Return ONLY valid JSON, no markdown.",
              structuredPrompt, 2000
            );
            const parsed = extractJson(text);
            if (parsed?.notes) {
              aiStructured = parsed;
              console.log("[Structured] Groq OK");
            }
          } catch (e) {
            console.log("[Structured] Groq FAILED:", String(e));
          }
        }

        if (!aiStructured && openaiApiKey) {
          try {
            console.log("[Structured] Trying GPT-4o mini (last resort)...");
            const text = await callOpenAI(
              openaiApiKey,
              "You are a botanical researcher. Return ONLY valid JSON, no markdown.",
              structuredPrompt, 2000
            );
            const parsed = extractJson(text);
            if (parsed?.notes) {
              aiStructured = parsed;
              console.log("[Structured] GPT-4o mini OK");
            }
          } catch (e) {
            console.log("[Structured] GPT-4o mini FAILED:", String(e));
          }
        }

        // Build body text from structured data for backward compatibility
        const dist = botResult.nativeDistribution.join(", ") || "不明";
        const bodyJp = aiStructured?.notes || `${botResult.authors}が${botResult.publicationYear ? botResult.publicationYear + "年に" : ""}${botResult.publication ? botResult.publication + " " + botResult.referenceCollation + "にて" : ""}記載。${dist}原産。サトイモ科（Araceae）に属する着生または地生植物。`;
        const yearPart = botResult.publicationYear ? ` in ${botResult.publicationYear}` : "";
        const pubPart = botResult.publication ? ` in ${botResult.publication} ${botResult.referenceCollation}` : "";
        const bodyEn = aiStructured?.notes_en || `${botResult.name} was described by ${botResult.authors}${yearPart}${pubPart}. Native to ${dist}. An epiphytic or terrestrial member of the family Araceae.`;

        const tierInfo = TIER_CONFIG.S;
        const ipniId = botResult.fqId.replace("urn:lsid:ipni.org:names:", "");
        originEntries.push({
          body: bodyJp,
          body_en: bodyEn,
          trust: 95,
          trustClass: "trust--high",
          source_type: "ipni_powo",
          source_tier: "S",
          source_tier_label_en: tierInfo.label_en,
          source_tier_label_jp: tierInfo.label_jp,
          source_name: "IPNI / POWO (Kew Gardens)",
          source_url: `https://powo.science.kew.org/taxon/${botResult.fqId}`,
          source_language: "en",
          parentage: null,
          discovery_year: botResult.publicationYear ? parseInt(botResult.publicationYear) : null,
          discoverer_or_breeder: botResult.authors,
          native_region: botResult.nativeDistribution.join(", ") || null,
          first_description: botResult.publicationYear
            ? `${botResult.authors}, ${botResult.publication} ${botResult.referenceCollation} (${botResult.publicationYear})`
            : `${botResult.authors}`,
          structured: (() => {
            // Helper: treat "不明" as empty so fallback chain works
            const known = (v: any) => v && v !== "不明" ? v : "";
            const ipniCollector = botResult.collectorTeam ? botResult.collectorTeam.replace(/\s+\d+$/, "") : "";
            const ipniLocality = botResult.typeLocality && botResult.typeLocality !== "sine loc." ? botResult.typeLocality : "";
            return {
              origin_type: "species" as const,
              author_name: botResult.authors || "不明",
              publication_year: botResult.publicationYear ? parseInt(botResult.publicationYear) : null,
              collector: known(aiStructured?.collector) || ipniCollector || "不明",
              collection_year: aiStructured?.collection_year || null,
              type_locality: known(aiStructured?.type_locality) || ipniLocality || botResult.nativeDistribution[0] || "不明",
              known_habitats: botResult.typeDistribution || dist || "不明",
              notes: "",
              citation_links: [
                { url: `https://www.ipni.org/n/${ipniId}`, label: "IPNI" },
                { url: `https://powo.science.kew.org/taxon/${botResult.fqId}`, label: "POWO (Kew)" },
              ],
            };
          })(),
          author: {
            name: "IPNI / POWO",
            isAI: true,
            date: new Date().toISOString().split("T")[0],
          },
          sources: [
            { url: `https://www.ipni.org/n/${ipniId}`, label: "IPNI" },
            { url: `https://powo.science.kew.org/taxon/${botResult.fqId}`, label: "POWO (Kew)" },
          ],
          votes: { agree: 0, disagree: 0 },
          verified: true,
        });
      } else {
        console.log(`[Species] No results from botanical DBs, falling back to AI`);
      }
    }

    // ================================================================
    // ROUTE B: CLONE/Hybrid → AI VERIFICATION of user text
    //          Species not found → AI generation (legacy)
    // ================================================================
    if (originEntries.length === 0) {
      const epithetMatch = cultivar_name.match(/'([^']+)'/);
      const cultivarEpithet = epithetMatch ? epithetMatch[1] : cultivar_name.split(/\s+/).slice(1).join(" ");
      const effectiveGenus = genus || parsed.genus;

      // ---- CLONE/Hybrid: Verify user text (no AI generation) ----
      if (plantType === "hybrid" || plantType === "clone") {
        // Resolve user text: prefer passed user_text, fallback to DB manual origins
        let effectiveUserText = (user_text || "").trim();
        let effectiveUserSources: string[] = Array.isArray(user_sources) ? user_sources.filter(Boolean) : [];

        if (!effectiveUserText) {
          // Try to find user text from manual_origins or DB
          const userOrigin = manualOrigins.find(
            (o: any) => o.source_type === "user_verified" || o.source_type === "manual" || (o.author && o.author.isAI === false)
          );
          if (userOrigin) {
            effectiveUserText = userOrigin.body || "";
            effectiveUserSources = (userOrigin.sources || []).map((s: any) => s.url || s.text || "").filter(Boolean);
          }
        }

        if (!effectiveUserText) {
          // No user text available — skip AI, just mark completed
          console.log(`[Verify] No user text for ${plantType} "${cultivar_name}", skipping verification`);
          researchSource = "none";
        } else {
          console.log(`[Verify] Verifying user text for ${plantType}: ${cultivar_name} (${effectiveUserText.length} chars)`);

          // Gather external data for cross-referencing
          let externalData: ExternalData = { wikidata: null, papers: [] };
          console.log(`[Verify] Gathering external data for ${plantType}: ${effectiveGenus} ${cultivarEpithet}`);
          externalData = await gatherExternalData(effectiveGenus, cultivarEpithet);
          const hasWd = externalData.wikidata ? "yes" : "no";
          const paperCount = externalData.papers.length;
          console.log(`[Verify] External data: wikidata=${hasWd}, papers=${paperCount}`);

          // Build verification prompt
          const verifyPrompt = buildVerificationPrompt(
            cultivar_name, effectiveGenus, plantType,
            effectiveUserText, effectiveUserSources, externalData
          );

          let verifyResult: any = null;

          // LLM cascade for verification
          if (geminiApiKey) {
            try {
              console.log("[Verify] Trying Gemini...");
              const text = await callGemini(geminiApiKey, verifyPrompt, 3000);
              verifyResult = extractJson(text);
              if (verifyResult?.verification_tier) {
                researchSource = "gemini-verify";
                console.log(`[Verify] Gemini OK: tier=${verifyResult.verification_tier}`);
              } else {
                verifyResult = null;
              }
            } catch (e) {
              console.log("[Verify] Gemini failed:", String(e));
            }
          }

          if (!verifyResult && groqApiKey) {
            try {
              console.log("[Verify] Trying Groq...");
              const text = await callGroq(
                groqApiKey, "llama-3.3-70b-versatile",
                "You are a botanical fact-checker. Respond ONLY with valid JSON, no markdown.",
                verifyPrompt, 3000
              );
              verifyResult = extractJson(text);
              if (verifyResult?.verification_tier) {
                researchSource = "groq-verify";
                console.log(`[Verify] Groq OK: tier=${verifyResult.verification_tier}`);
              }
            } catch (e) {
              console.log("[Verify] Groq failed:", String(e));
            }
          }

          if (!verifyResult && openaiApiKey) {
            try {
              console.log("[Verify] Trying GPT-4o mini...");
              const text = await callOpenAI(
                openaiApiKey,
                "You are a botanical fact-checker. Respond ONLY with valid JSON, no markdown.",
                verifyPrompt, 3000
              );
              verifyResult = extractJson(text);
              if (verifyResult?.verification_tier) {
                researchSource = "gpt4o-mini-verify";
                console.log(`[Verify] GPT-4o mini OK: tier=${verifyResult.verification_tier}`);
              }
            } catch (e) {
              console.log("[Verify] GPT-4o mini failed:", String(e));
            }
          }

          // Build verified origin entry
          if (verifyResult?.verification_tier) {
            const vTier = verifyResult.verification_tier || "D";
            const vConf = Math.max(0, Math.min(1, verifyResult.confidence || 0));
            const trust = calculateVerificationTrust(vTier, vConf);
            const tierInfo = TIER_CONFIG[vTier] || TIER_CONFIG.D;

            let trustClass = "trust--low";
            if (trust >= 70) trustClass = "trust--high";
            else if (trust >= 40) trustClass = "trust--mid";

            // Build sources: user sources + AI-found sources + external DB sources
            const sourcesArr: any[] = effectiveUserSources.map(u => ({ url: u, label: u }));
            const foundSources = verifyResult.found_sources || [];
            for (const fs of foundSources) {
              if (fs.url) sourcesArr.push({ url: fs.url, label: fs.label || fs.url });
            }
            if (externalData.wikidata) {
              sourcesArr.push({ url: externalData.wikidata.wikidataUrl, label: "Wikidata" });
            }
            for (const paper of externalData.papers) {
              sourcesArr.push({ url: `https://doi.org/${paper.doi}`, label: `${paper.journal} (${paper.year})` });
            }

            // Extract structured data for clone/hybrid/seedling
            let cultivarStructured: any = null;
            const structPrompt = buildCultivarStructuredPrompt(
              cultivar_name, effectiveGenus, plantType, effectiveUserText, verifyResult
            );

            // LLM cascade for structured extraction
            if (geminiApiKey) {
              try {
                console.log("[CultivarStructured] Trying Gemini...");
                const text = await callGemini(geminiApiKey, structPrompt);
                cultivarStructured = extractJson(text);
                if (cultivarStructured) console.log("[CultivarStructured] Gemini OK");
              } catch (e) {
                console.log("[CultivarStructured] Gemini FAILED:", String(e));
              }
            }
            if (!cultivarStructured && groqApiKey) {
              try {
                console.log("[CultivarStructured] Trying Groq...");
                const text = await callGroq(
                  groqApiKey, "llama-3.3-70b-versatile",
                  "You are a botanical researcher. Return ONLY valid JSON, no markdown.",
                  structPrompt, 2000
                );
                cultivarStructured = extractJson(text);
                if (cultivarStructured) console.log("[CultivarStructured] Groq OK");
              } catch (e) {
                console.log("[CultivarStructured] Groq FAILED:", String(e));
              }
            }
            if (!cultivarStructured && openaiApiKey) {
              try {
                console.log("[CultivarStructured] Trying GPT-4o mini...");
                const text = await callOpenAI(
                  openaiApiKey,
                  "You are a botanical researcher. Return ONLY valid JSON, no markdown.",
                  structPrompt, 2000
                );
                cultivarStructured = extractJson(text);
                if (cultivarStructured) console.log("[CultivarStructured] GPT-4o mini OK");
              } catch (e) {
                console.log("[CultivarStructured] GPT-4o mini FAILED:", String(e));
              }
            }

            // Build structured object from AI result
            const cs = cultivarStructured || {};
            const structuredObj: any = { origin_type: plantType };
            if (plantType === "clone") {
              structuredObj.namer = cs.namer || "不明";
              structuredObj.naming_year = cs.naming_year || null;
            } else if (plantType === "hybrid") {
              structuredObj.breeder = cs.breeder || "不明";
              structuredObj.naming_year = cs.naming_year || null;
            } else if (plantType === "seedling") {
              structuredObj.breeder = cs.breeder || "不明";
              structuredObj.sowing_date = cs.sowing_date || null;
            }
            if (cs.formula && (cs.formula.parentA || cs.formula.parentB)) {
              structuredObj.formula = {
                parentA: cs.formula.parentA || "",
                parentB: cs.formula.parentB || "",
              };
            }
            structuredObj.notes = cs.notes || effectiveUserText.substring(0, 150);
            structuredObj.citation_links = sourcesArr
              .filter((s: any) => s.url)
              .map((s: any) => ({ url: s.url, label: s.label || s.url }));

            originEntries.push({
              body: effectiveUserText,
              body_en: cs.notes_en || "",
              trust,
              trustClass,
              source_type: "user_verified",
              source_tier: vTier,
              source_tier_label_en: tierInfo.label_en,
              source_tier_label_jp: tierInfo.label_jp,
              source_name: "",
              source_url: "",
              source_language: "ja",
              parentage: structuredObj.formula
                ? `${structuredObj.formula.parentA} × ${structuredObj.formula.parentB}`
                : null,
              discovery_year: structuredObj.naming_year || null,
              discoverer_or_breeder: structuredObj.namer || structuredObj.breeder || null,
              native_region: null,
              first_description: null,
              structured: structuredObj,
              verification: {
                claims: verifyResult.claims_verified || [],
                summary_jp: verifyResult.verification_summary_jp || "",
                summary_en: verifyResult.verification_summary_en || "",
                warnings: verifyResult.warnings || [],
                source_quality: verifyResult.source_quality || "unverifiable",
                found_sources: foundSources,
                verified_at: new Date().toISOString(),
              },
              author: {
                name: "User",
                isAI: false,
                date: new Date().toISOString().split("T")[0],
              },
              sources: sourcesArr,
              votes: { agree: 0, disagree: 0 },
              verified: false,
            });
          } else {
            // Verification LLM failed — save user text without verification
            console.log("[Verify] All LLMs failed, saving user text without verification");
            const tierInfo = TIER_CONFIG.D;
            const fallbackStructured: any = { origin_type: plantType };
            if (plantType === "clone") {
              fallbackStructured.namer = "不明";
              fallbackStructured.naming_year = null;
            } else if (plantType === "hybrid") {
              fallbackStructured.breeder = "不明";
              fallbackStructured.naming_year = null;
            } else if (plantType === "seedling") {
              fallbackStructured.breeder = "不明";
              fallbackStructured.sowing_date = null;
            }
            fallbackStructured.notes = effectiveUserText.substring(0, 150);
            fallbackStructured.citation_links = effectiveUserSources
              .filter(Boolean)
              .map(u => ({ url: u, label: u }));

            originEntries.push({
              body: effectiveUserText,
              body_en: "",
              trust: 20,
              trustClass: "trust--low",
              source_type: "manual",
              source_tier: "D",
              source_tier_label_en: tierInfo.label_en,
              source_tier_label_jp: tierInfo.label_jp,
              source_name: "",
              source_url: "",
              source_language: "ja",
              parentage: null,
              discovery_year: null,
              discoverer_or_breeder: null,
              native_region: null,
              first_description: null,
              structured: fallbackStructured,
              author: {
                name: "User",
                isAI: false,
                date: new Date().toISOString().split("T")[0],
              },
              sources: effectiveUserSources.map(u => ({ url: u, label: u })),
              votes: { agree: 0, disagree: 0 },
              verified: false,
            });
          }
        }

      // ---- Species fallback: AI generation (unchanged) ----
      } else {
        console.log(`[Research] AI research for: ${cultivar_name} (type: ${plantType})`);

        let externalData: ExternalData = { wikidata: null, papers: [] };
        const researchPrompt = buildCultivarResearchPrompt(cultivar_name, effectiveGenus, plantType);

        let researchResult: any = null;

        if (geminiApiKey) {
          try {
            console.log("Trying Gemini for cultivar research...");
            const text = await callGemini(geminiApiKey, researchPrompt, 3000);
            researchResult = extractJson(text);
            if (researchResult?.origins?.length) {
              researchSource = "gemini";
            } else {
              researchResult = null;
            }
          } catch (e) {
            console.log("Gemini failed:", String(e));
          }
        }

        if (!researchResult && groqApiKey) {
          try {
            const text = await callGroq(
              groqApiKey, "llama-3.3-70b-versatile",
              "You are a botanical taxonomist. Respond ONLY with valid JSON, no markdown.",
              researchPrompt, 3000
            );
            researchResult = extractJson(text);
            if (researchResult?.origins?.length) {
              researchSource = "groq-llama3.3-70b";
            }
          } catch (e) {
            console.error("Groq error:", e);
          }
        }

        if (!researchResult && openaiApiKey) {
          try {
            const text = await callOpenAI(
              openaiApiKey,
              "You are a botanical taxonomist. Respond ONLY with valid JSON, no markdown.",
              researchPrompt, 3000
            );
            researchResult = extractJson(text);
            if (researchResult?.origins?.length) {
              researchSource = "gpt-4o-mini";
            }
          } catch (e) {
            console.error("GPT-4o mini error:", e);
          }
        }

        if (researchResult?.origins?.length) {
          for (const origin of researchResult.origins) {
            const tier = origin.source_tier || "D";
            const aiConf = Math.max(0, Math.min(1, origin.confidence || 0));
            const tierInfo = TIER_CONFIG[tier] || TIER_CONFIG.D;
            let trust = Math.round(tierInfo.base_min + (tierInfo.base_max - tierInfo.base_min) * aiConf);
            trust = Math.max(tierInfo.base_min, Math.min(tierInfo.base_max, trust));

            let bodyJp = origin.description_jp || "";
            const bodyEn = origin.description_en || "";
            if (!bodyJp || bodyJp.length < 15) bodyJp = bodyEn;

            let trustClass = "trust--low";
            if (trust >= 70) trustClass = "trust--high";
            else if (trust >= 40) trustClass = "trust--mid";

            const sourcesArr: any[] = origin.source_url ? [{ url: origin.source_url, label: origin.source_name }] : [];

            // Build structured fields from AI research result — adapt to plantType
            const citLinks = origin.source_url
              ? [{ url: origin.source_url, label: origin.source_name || origin.source_url }]
              : [];
            const structuredEntry: any = { origin_type: plantType, notes: plantType === "species" ? "" : bodyJp, citation_links: citLinks };

            if (plantType === "species") {
              structuredEntry.author_name = origin.discoverer_or_breeder || "不明";
              structuredEntry.publication_year = origin.discovery_year || null;
              structuredEntry.collector = "不明";
              structuredEntry.collection_year = null;
              structuredEntry.type_locality = origin.native_region || "不明";
              structuredEntry.known_habitats = origin.native_region || "不明";
            } else if (plantType === "clone") {
              structuredEntry.namer = origin.discoverer_or_breeder || "不明";
              structuredEntry.naming_year = origin.discovery_year || null;
              if (origin.parentage) {
                const parts = (origin.parentage || "").split(/\s*[×x]\s*/i);
                structuredEntry.formula = { parentA: parts[0] || "", parentB: parts[1] || "" };
              }
            } else if (plantType === "hybrid") {
              structuredEntry.breeder = origin.discoverer_or_breeder || "不明";
              structuredEntry.naming_year = origin.discovery_year || null;
              if (origin.parentage) {
                const parts = (origin.parentage || "").split(/\s*[×x]\s*/i);
                structuredEntry.formula = { parentA: parts[0] || "", parentB: parts[1] || "" };
              }
            } else if (plantType === "seedling") {
              structuredEntry.breeder = origin.discoverer_or_breeder || "不明";
              structuredEntry.sowing_date = null;
              if (origin.parentage) {
                const parts = (origin.parentage || "").split(/\s*[×x]\s*/i);
                structuredEntry.formula = { parentA: parts[0] || "", parentB: parts[1] || "" };
              }
            }

            originEntries.push({
              body: bodyJp,
              body_en: bodyEn,
              trust,
              trustClass,
              source_type: "ai_research",
              source_tier: tier,
              source_tier_label_en: tierInfo.label_en,
              source_tier_label_jp: tierInfo.label_jp,
              source_name: origin.source_name || "",
              source_url: origin.source_url || "",
              source_language: origin.source_language || "en",
              parentage: origin.parentage || null,
              discovery_year: origin.discovery_year || null,
              discoverer_or_breeder: origin.discoverer_or_breeder || null,
              native_region: origin.native_region || null,
              first_description: origin.first_description || null,
              structured: structuredEntry,
              author: {
                name: researchSource === "gemini" ? "AI (Gemini 2.0 Flash)" : researchSource === "gpt-4o-mini" ? "AI (GPT-4o mini)" : "AI (Llama 3.3 70B)",
                isAI: true,
                date: new Date().toISOString().split("T")[0],
              },
              sources: sourcesArr,
              votes: { agree: 0, disagree: 0 },
              verified: false,
            });
          }
        }
      }
    }

    // ================================================================
    // If no origins found at all, create a placeholder
    // ================================================================
    if (originEntries.length === 0) {
      const tierInfo = TIER_CONFIG.D;
      const placeholderBodyJp = `${cultivar_name}の由来は不明です。正確な作出者・交配親についての学術的な記録は確認されていません。`;
      originEntries.push({
        body: placeholderBodyJp,
        body_en: `The origin of ${cultivar_name} is unknown. No academic records confirming the creator or parentage have been verified.`,
        trust: 20,
        trustClass: "trust--low",
        source_type: "none",
        source_tier: "D",
        source_tier_label_en: tierInfo.label_en,
        source_tier_label_jp: tierInfo.label_jp,
        source_name: "No source available",
        source_url: "",
        source_language: "en",
        parentage: null,
        discovery_year: null,
        discoverer_or_breeder: null,
        native_region: null,
        first_description: null,
        structured: (function() {
          const pt = plantType || "species";
          const base: any = { origin_type: pt, notes: pt === "species" ? "" : placeholderBodyJp, citation_links: [] };
          if (pt === "species") {
            base.author_name = "不明"; base.publication_year = null;
            base.collector = "不明"; base.collection_year = null;
            base.type_locality = "不明"; base.known_habitats = "不明";
          } else if (pt === "clone") {
            base.namer = "不明"; base.naming_year = null;
          } else if (pt === "hybrid") {
            base.breeder = "不明"; base.naming_year = null;
          } else if (pt === "seedling") {
            base.breeder = "不明"; base.sowing_date = null;
          }
          return base;
        })(),
        author: {
          name: "System",
          isAI: true,
          date: new Date().toISOString().split("T")[0],
        },
        sources: [],
        votes: { agree: 0, disagree: 0 },
        verified: false,
      });
    }

    // Merge: AI origins + preserved manual origins
    originEntries = [...originEntries, ...manualOrigins];

    // Sort by trust descending
    originEntries.sort((a, b) => b.trust - a.trust);

    // ================================================================
    // Update database (AI origins + preserved manual origins)
    // ================================================================
    const bestTrust = originEntries[0]?.trust || 0;

    // Preview mode: return structured data without DB writes
    if (preview) {
      console.log(`[Preview] ${cultivar_name}: ${originEntries.length} origins, best trust: ${bestTrust}%`);
      return new Response(
        JSON.stringify({
          success: originEntries.length > 0,
          structured: originEntries[0]?.structured || null,
          body: originEntries[0]?.body || null,
          sources: originEntries[0]?.sources || [],
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { error: updateError } = await supabase
      .from("cultivars")
      .update({
        origins: originEntries,
        ai_status: "completed",
        ai_research_data: {
          research_source: researchSource,
          origins_count: originEntries.length,
          best_trust: bestTrust,
          researched_at: new Date().toISOString(),
        },
      })
      .eq("id", cultivar_id);

    if (updateError) {
      console.error("DB update error:", updateError);
      await supabase
        .from("cultivars")
        .update({ ai_status: "failed" })
        .eq("id", cultivar_id);
      return new Response(
        JSON.stringify({ error: "Failed to update database", details: updateError }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[Done] ${cultivar_name}: ${originEntries.length} origins, best trust: ${bestTrust}%, source: ${researchSource}`);

    return new Response(
      JSON.stringify({
        success: true,
        cultivar_id,
        origins_count: originEntries.length,
        best_trust: bestTrust,
        research_source: researchSource,
        ai_status: "completed",
        debug_body_length: originEntries[0]?.body?.length || 0,
        debug_has_fallback: (originEntries[0]?.body || "").includes("サトイモ科"),
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Unexpected error:", err);
    return new Response(
      JSON.stringify({ error: "Internal server error", message: String(err) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
