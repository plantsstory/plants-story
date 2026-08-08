import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SITE_URL = "https://plantsstory.com/";

serve(async (_req: Request) => {
  const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
  const supabaseKey =
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ||
    Deno.env.get("SUPABASE_ANON_KEY") ||
    "";
  const sb = createClient(supabaseUrl, supabaseKey);

  const today = new Date().toISOString().split("T")[0];

  // Static pages
  const staticPages = [
    { loc: SITE_URL, priority: "1.0", changefreq: "daily" },
    { loc: SITE_URL + "about", priority: "0.5", changefreq: "monthly" },
    { loc: SITE_URL + "guide", priority: "0.5", changefreq: "monthly" },
    { loc: SITE_URL + "terms", priority: "0.3", changefreq: "monthly" },
    { loc: SITE_URL + "privacy", priority: "0.3", changefreq: "monthly" },
    { loc: SITE_URL + "tokushoho", priority: "0.3", changefreq: "monthly" },
    { loc: SITE_URL + "contact", priority: "0.3", changefreq: "monthly" },
  ];

  // Genus pages from DB (visible genera only)
  let genera: { slug: string; name: string }[] = [];
  try {
    let { data } = await sb
      .from("genera")
      .select("slug, name")
      .eq("is_visible", true)
      .order("display_order");
    if (!data) {
      // is_visible column may not exist yet — retry unfiltered
      ({ data } = await sb.from("genera").select("slug, name").order("display_order"));
    }
    if (data) genera = data;
  } catch (_e) { /* fallback: empty */ }
  const visibleGenusNames = new Set(genera.map((g) => g.name));

  // All cultivar names from DB
  let cultivars: { cultivar_name: string; genus: string }[] = [];
  try {
    const { data } = await sb
      .from("cultivars")
      .select("cultivar_name, genus")
      .order("cultivar_name");
    if (data) cultivars = data;
  } catch (_e) { /* fallback: empty */ }

  // Build XML
  let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
  xml += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n';

  // Static pages
  for (const p of staticPages) {
    xml += urlEntry(p.loc, today, p.changefreq, p.priority);
  }

  // Genus pages
  for (const g of genera) {
    xml += urlEntry(SITE_URL + g.slug, today, "daily", "0.9");
  }

  // Cultivar pages (path URLs matching the static site; skip paywalled seedlings)
  for (const c of cultivars) {
    if (c.cultivar_name.includes("[Seedling]")) continue;
    const genus = c.genus || "Anthurium";
    if (!visibleGenusNames.has(genus)) continue;
    const genusSlug = genus.toLowerCase();
    const rest = c.cultivar_name.startsWith(genus + " ")
      ? c.cultivar_name.slice(genus.length + 1)
      : c.cultivar_name;
    xml += urlEntry(SITE_URL + genusSlug + "/" + encodeURIComponent(rest), today, "weekly", "0.8");
  }

  xml += "</urlset>";

  return new Response(xml, {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "public, max-age=3600, s-maxage=3600",
    },
  });
});

function urlEntry(
  loc: string,
  lastmod: string,
  changefreq: string,
  priority: string,
): string {
  return `  <url>
    <loc>${esc(loc)}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>${changefreq}</changefreq>
    <priority>${priority}</priority>
  </url>\n`;
}

function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}
