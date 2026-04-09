import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

/**
 * OGP Prerendering Edge Function
 *
 * SNS crawlers don't execute JavaScript, so SPA dynamic meta tags are invisible.
 * This function serves a lightweight HTML page with proper OG meta tags,
 * then redirects human visitors to the actual SPA page.
 *
 * Usage: https://<project>.supabase.co/functions/v1/share?name=Anthurium%20crystallinum
 */

const SITE_URL = "https://plantsstory.github.io/plants-story/";

serve(async (req: Request) => {
  const url = new URL(req.url);
  const name = url.searchParams.get("name") || "";

  if (!name) {
    return new Response("Missing name parameter", { status: 400 });
  }

  // Build Supabase client (service role for public read)
  const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
  const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || Deno.env.get("SUPABASE_ANON_KEY") || "";
  const supabase = createClient(supabaseUrl, supabaseKey);

  // Fetch cultivar data from DB
  let genus = "";
  let type = "species";
  let description = "";
  let imageUrl = "";

  try {
    const { data } = await supabase
      .from("cultivars")
      .select("genus, type, origins")
      .eq("cultivar_name", name)
      .maybeSingle();

    if (data) {
      genus = data.genus || "";
      type = data.type || "species";

      // Extract first origin description
      const origins = data.origins || [];
      if (Array.isArray(origins) && origins.length > 0) {
        // Sort by trust desc, take best one
        const sorted = [...origins].sort((a: any, b: any) => (b.trust || 0) - (a.trust || 0));
        const best = sorted[0];
        if (best.description_jp) {
          description = best.description_jp.substring(0, 200);
        } else if (best.description) {
          description = best.description.substring(0, 200);
        }
      }
    }
  } catch (_e) {
    // DB error — proceed with defaults
  }

  // Try to get a thumbnail image
  try {
    const { data: imgData } = await supabase
      .from("cultivar_images")
      .select("storage_path")
      .eq("cultivar_name", name.replace(" [Seedling]", ""))
      .order("display_order", { ascending: true })
      .limit(1)
      .maybeSingle();

    if (imgData?.storage_path) {
      imageUrl = supabaseUrl + "/storage/v1/object/public/gallery-images/" + imgData.storage_path;
    }
  } catch (_e) {
    // No image — use OG image function as fallback
  }

  const displayName = name.replace(" [Seedling]", "");
  const typeLabels: Record<string, string> = {
    species: "原種",
    hybrid: "Hybrid",
    clone: "Clone",
    seedling: "Seedling",
  };
  const typeLabel = typeLabels[type] || "";

  const title = displayName + " - " + genus + " | ひなたぼっこぷらんつ - Plants Story";
  const desc = description || displayName + " (" + genus + " " + typeLabel + ") の由来・歴史情報";
  const genusSlug = (genus || displayName.split(" ")[0]).toLowerCase();
  const rest = displayName.replace(/^\S+\s*/, "");
  const spaUrl = SITE_URL + genusSlug + "/" + encodeURIComponent(rest);

  // Fallback OG image: use og-image Edge Function
  const ogImage = imageUrl || (supabaseUrl + "/functions/v1/og-image?name=" + encodeURIComponent(displayName) + "&genus=" + encodeURIComponent(genus) + "&type=" + encodeURIComponent(type));

  // Return HTML with OG meta tags + auto-redirect for human visitors
  const html = `<!DOCTYPE html>
<html lang="ja">
<head>
<meta charset="UTF-8">
<title>${esc(title)}</title>
<meta name="description" content="${esc(desc)}">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(desc)}">
<meta property="og:type" content="article">
<meta property="og:url" content="${esc(spaUrl)}">
<meta property="og:image" content="${esc(ogImage)}">
<meta property="og:site_name" content="ひなたぼっこぷらんつ - Plants Story">
<meta property="og:locale" content="ja_JP">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${esc(title)}">
<meta name="twitter:description" content="${esc(desc)}">
<meta name="twitter:image" content="${esc(ogImage)}">
<link rel="canonical" href="${esc(spaUrl)}">
<meta http-equiv="refresh" content="0;url=${esc(spaUrl)}">
</head>
<body>
<p>Redirecting to <a href="${esc(spaUrl)}">${esc(displayName)} - Plants Story</a>...</p>
<script>window.location.replace(${JSON.stringify(spaUrl)});</script>
</body>
</html>`;

  return new Response(html, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "public, max-age=3600, s-maxage=3600",
    },
  });
});

function esc(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
