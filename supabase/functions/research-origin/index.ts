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
async function searchIPNI(genus: string, species: string): Promise<{ year: string; publication: string; collation: string } | null> {
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
      };
    }
    return null;
  } catch {
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
    console.log(`[DB] IPNI found: ${ipni.year} ${ipni.publication} ${ipni.collation}`);
  }

  return {
    name: powoSearch.name,
    authors: powoTaxon.author,
    fqId: powoSearch.fqId,
    nativeDistribution: powoTaxon.distributions,
    publicationYear: ipni?.year || "",
    publication: ipni?.publication || "",
    referenceCollation: ipni?.collation || "",
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
function buildSpeciesDescriptionPrompt(bot: BotanicalResult): string {
  const distribution = bot.nativeDistribution.join(", ") || "不明";

  return `You are a botanical writer creating an accessible, informative description of a plant species.
You are given VERIFIED data from IPNI and POWO (Kew Gardens).

Your goal: Write a description that a plant enthusiast (not a scientist) can enjoy reading.
Include the scientific citation, but ALSO describe what makes this plant special and recognizable.

=== VERIFIED DATA ===
Scientific name: ${bot.name}
Authors: ${bot.authors}
Publication year: ${bot.publicationYear || "unknown"}
Publication: ${bot.publication || "unknown"} ${bot.referenceCollation || ""}
Family: Araceae
Native distribution: ${distribution}

=== WRITING GUIDELINES ===
1. Start with the scientific citation (who described it, when, where published).
2. Then describe the plant's APPEARANCE: leaf shape, color, texture, venation pattern, petiole characteristics. These are well-known morphological features for Araceae - use your knowledge.
   IMPORTANT: Do NOT include specific size measurements (e.g., "30-40cm", "1m tall"). Sizes vary greatly between individuals depending on growing conditions.
3. Mention the native habitat briefly (tropical rainforest, cloud forest, etc.) based on distribution.
4. Keep it engaging but factual. No care tips, no flower language, no commercial info.
5. 日本語: 自然な日本語で、植物好きの人が読んで楽しい文章にする。学名・人名・地名は英語のまま。

=== OUTPUT FORMAT ===
Return ONLY valid JSON (no markdown, no code blocks):
{
  "body": "日本語の説明文 (150-300文字)。最初に記載情報、次に植物の見た目の特徴、最後に自生地の環境。",
  "body_en": "English description (100-250 words). Scientific citation first, then appearance and habitat."
}`;
}

// ============================================================
// Build research prompt for cultivars/hybrids (improved)
// ============================================================
function buildCultivarResearchPrompt(cultivarName: string, genus: string, type: string): string {
  return `You are a botanical taxonomist researching the origin of "${cultivarName}" (genus: ${genus}, type: ${type}).

=== CRITICAL RULES — VIOLATIONS WILL INVALIDATE YOUR RESPONSE ===

1. UNKNOWN = UNKNOWN. If the creator, breeder, or parentage is unknown, write null.
   NEVER guess or speculate. NEVER write "believed to be", "thought to be",
   "possibly", "likely", "speculated", "assumed", or "presumed".

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
- 日本語: 自然で読みやすい文章。「信頼できる情報源が見つからなかったため…」のような冗長な表現は避ける。`;
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

1. UNKNOWN = UNKNOWN. If the creator, breeder, or parentage is unknown, write null.
   NEVER guess or speculate. NEVER write "believed to be", "thought to be",
   "possibly", "likely", "speculated", "assumed", or "presumed".

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
- 日本語: 自然で読みやすい文章。冗長な表現は避ける。`;
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

1. UNKNOWN = UNKNOWN. If the origin, discoverer, or original plant is unknown, write null.
   NEVER guess or speculate. NEVER write "believed to be", "thought to be",
   "possibly", "likely", "speculated", "assumed", or "presumed".

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
- 日本語: 自然で読みやすい文章。冗長な表現は避ける。`;
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
    const { cultivar_id, genus, cultivar_name, type, manual_origins, user_text, user_sources } = await req.json();

    if (!cultivar_id || !cultivar_name) {
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
    } else {
      const { data: existingRow } = await supabase
        .from("cultivars")
        .select("origins")
        .eq("id", cultivar_id)
        .single();
      manualOrigins = (existingRow?.origins || []).filter(
        (o: any) => o.source_type === "manual" || (o.author && o.author.isAI === false)
      );
      if (manualOrigins.length > 0) {
        console.log(`[Manual] Preserved ${manualOrigins.length} manual origins from DB`);
      }
    }

    // Update status to researching
    await supabase
      .from("cultivars")
      .update({ ai_status: "researching" })
      .eq("id", cultivar_id);

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

        // Generate description text using AI (based on DB data only)
        let bodyJp = "";
        let bodyEn = "";

        const descPrompt = buildSpeciesDescriptionPrompt(botResult);

        if (geminiApiKey) {
          try {
            console.log("[Desc] Trying Gemini for description...");
            const text = await callGemini(geminiApiKey, descPrompt);
            console.log("[Desc] Gemini raw response length:", text?.length, "first 100:", text?.substring(0, 100));
            const descParsed = extractJson(text);
            if (descParsed?.body && descParsed?.body_en) {
              bodyJp = descParsed.body;
              bodyEn = descParsed.body_en;
              console.log("[Desc] Gemini OK, body length:", bodyJp.length);
            } else {
              console.log("[Desc] Gemini returned no valid JSON");
            }
          } catch (e) {
            console.log("[Desc] Gemini FAILED:", String(e));
          }
        } else {
          console.log("[Desc] No Gemini API key");
        }

        // Fallback: generate from structured data with Groq (simpler prompt)
        if (!bodyJp || bodyJp.length < 50) {
          const dist = botResult.nativeDistribution.join(", ") || "不明";
          const yearPart = botResult.publicationYear ? ` in ${botResult.publicationYear}` : "";
          const pubPart = botResult.publication ? ` in ${botResult.publication} ${botResult.referenceCollation}` : "";

          if (groqApiKey) {
            try {
              console.log("[Desc] bodyJp length:", bodyJp?.length, "- trying Groq with simple prompt...");
              const simplePrompt = `Describe the plant "${botResult.name}" (Araceae) for plant enthusiasts.
Include: leaf shape, color, texture, venation, and growth habit. Do NOT include specific size measurements as they vary by individual.
It was described by ${botResult.authors}${yearPart}${pubPart}. Native to ${dist}.

Return JSON only: {"body": "日本語150-300文字。記載情報→外見の特徴→自生地。学名・人名・地名は英語", "body_en": "English 100-200 words"}`;
              const groqText = await callGroq(
                groqApiKey,
                "llama-3.3-70b-versatile",
                "You are a botanical writer. Return ONLY valid JSON.",
                simplePrompt,
                1500
              );
              console.log("[Desc] Groq raw response length:", groqText?.length, "first 100:", groqText?.substring(0, 100));
              const groqDesc = extractJson(groqText);
              if (groqDesc?.body && groqDesc.body.length >= 50) {
                bodyJp = groqDesc.body;
                bodyEn = groqDesc.body_en || bodyEn;
                console.log("[Desc] Groq OK, body length:", bodyJp.length);
              } else {
                console.log("[Desc] Groq returned no valid JSON or body too short");
              }
            } catch (e) {
              console.log("[Desc] Groq FAILED:", String(e));
            }
          }

          // Fallback 3: GPT-4o mini
          if ((!bodyJp || bodyJp.length < 50) && openaiApiKey) {
            try {
              console.log("[Desc] Trying GPT-4o mini for description...");
              const dist = botResult.nativeDistribution.join(", ") || "不明";
              const yearPart = botResult.publicationYear ? ` in ${botResult.publicationYear}` : "";
              const pubPart = botResult.publication ? ` in ${botResult.publication} ${botResult.referenceCollation}` : "";
              const simplePrompt = `Describe the plant "${botResult.name}" (Araceae) for plant enthusiasts.
Include: leaf shape, color, texture, venation, and growth habit. Do NOT include specific size measurements as they vary by individual.
It was described by ${botResult.authors}${yearPart}${pubPart}. Native to ${dist}.

Return JSON only: {"body": "日本語150-300文字。記載情報→外見の特徴→自生地。学名・人名・地名は英語", "body_en": "English 100-200 words"}`;
              const openaiText = await callOpenAI(
                openaiApiKey,
                "You are a botanical writer. Return ONLY valid JSON.",
                simplePrompt,
                1500
              );
              console.log("[Desc] GPT-4o mini raw response length:", openaiText?.length);
              const openaiDesc = extractJson(openaiText);
              if (openaiDesc?.body && openaiDesc.body.length >= 50) {
                bodyJp = openaiDesc.body;
                bodyEn = openaiDesc.body_en || bodyEn;
                console.log("[Desc] GPT-4o mini OK, body length:", bodyJp.length);
              }
            } catch (e) {
              console.log("[Desc] GPT-4o mini FAILED:", String(e));
            }
          }

          // Final fallback: structured template
          if (!bodyJp || bodyJp.length < 50) {
            bodyJp = `${botResult.authors}が${botResult.publicationYear ? botResult.publicationYear + "年に" : ""}${botResult.publication ? botResult.publication + " " + botResult.referenceCollation + "にて" : ""}記載。${dist}原産。サトイモ科（Araceae）に属する着生または地生植物。`;
            bodyEn = `${botResult.name} was described by ${botResult.authors}${yearPart}${pubPart}. Native to ${dist}. An epiphytic or terrestrial member of the family Araceae.`;
          }
        }

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

            originEntries.push({
              body: effectiveUserText,
              body_en: "",
              trust,
              trustClass,
              source_type: "user_verified",
              source_tier: vTier,
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
      originEntries.push({
        body: `${cultivar_name}の由来は不明です。正確な作出者・交配親についての学術的な記録は確認されていません。`,
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
