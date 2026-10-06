import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

/**
 * Old share links (https://<project>.supabase.co/functions/v1/share?name=…)
 *
 * This function used to serve an OGP page, but Supabase's default domain delivers HTML as text/plain
 * (with nosniff and a sandbox CSP), so people saw raw markup and crawlers saw no card. The share button
 * now gives the page URL on plantsstory.com, whose static stub carries the OG tags (BOARD 10-07 board 8).
 * Links already sent keep working: this function only redirects to that page.
 */

const SITE_URL = "https://plantsstory.com/";

// same form as getShareUrl() in wireframe/js/pages.js: quotes percent-encoded, trailing slash
export function pageUrl(genus: string, name: string): string {
  const display = name.replace(" [Seedling]", "");
  const g = (genus || display.split(" ")[0]).toLowerCase();
  const rest = display.replace(/^\S+\s*/, "");
  const enc = (s: string) => encodeURIComponent(s).replace(/'/g, "%27");
  return SITE_URL + enc(g) + "/" + enc(rest) + "/";
}

serve(async (req: Request) => {
  const url = new URL(req.url);
  const name = url.searchParams.get("name") || "";
  const home = new Response(null, { status: 302, headers: { Location: SITE_URL, "Cache-Control": "no-store" } });
  if (!name || name.length > 200) return home;

  const supabase = createClient(Deno.env.get("SUPABASE_URL") || "", Deno.env.get("SUPABASE_ANON_KEY") || Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "");
  try {
    // Seedling links use the display name; the DB stores the [Seedling] suffix
    const variants = [name];
    if (!name.includes("[Seedling]")) variants.push(name + " [Seedling]");
    const { data: rows } = await supabase.from("cultivars").select("genus, cultivar_name, is_private").in("cultivar_name", variants).limit(1);
    const found = (rows || [])[0];
    // unknown or owner-only records: the top page (a guessed name must not confirm a private record)
    if (!found || found.is_private) return home;
    return new Response(null, {
      status: 301,
      headers: { Location: pageUrl(found.genus || "", found.cultivar_name || name), "Cache-Control": "public, max-age=3600" },
    });
  } catch (_e) {
    return home;
  }
});
