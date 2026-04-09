import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import init, { svg2png } from "https://deno.land/x/resvg_wasm@0.0.2/mod.ts";

const ALLOWED_ORIGINS = [
  "https://plantsstory.com",
  "https://www.plantsstory.com",
  "http://localhost:3000",
];

function getCorsOrigin(req: Request): string {
  const origin = req.headers.get("origin") || "";
  return ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
}

const corsHeaders = (req: Request) => ({
  "Access-Control-Allow-Origin": getCorsOrigin(req),
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
});

let wasmInitialized = false;

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders(req) });
  }

  try {
    const url = new URL(req.url);
    const name = url.searchParams.get("name") || "";
    const genus = url.searchParams.get("genus") || "";
    const type = url.searchParams.get("type") || "species";

    if (!name) {
      return new Response("Missing name parameter", { status: 400 });
    }

    // Type badge colors and labels
    const typeConfig: Record<string, { color: string; label: string }> = {
      species: { color: "#2D6A4F", label: "Original Species" },
      hybrid: { color: "#7B2D8B", label: "Hybrid" },
      clone: { color: "#1565C0", label: "Clone" },
      seedling: { color: "#E65100", label: "Seedling" },
    };

    const tc = typeConfig[type] || typeConfig.species;
    const displayName = name.replace(" [Seedling]", "");

    // Truncate long names
    const maxChars = 30;
    const truncated =
      displayName.length > maxChars
        ? displayName.substring(0, maxChars) + "…"
        : displayName;

    // Calculate font size based on name length
    const fontSize = truncated.length > 20 ? 36 : truncated.length > 14 ? 42 : 48;

    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#0B2B1E"/>
      <stop offset="100%" stop-color="#1B4332"/>
    </linearGradient>
  </defs>
  <rect width="1200" height="630" fill="url(#bg)"/>
  <!-- Decorative leaf -->
  <path d="M950 50C850 10 720 60 700 180C680 300 820 420 950 500C1080 420 1200 300 1180 180C1160 60 1050 10 950 50Z" fill="#52B788" opacity="0.12"/>
  <path d="M950 70V480" stroke="#F5F7F2" stroke-width="3" fill="none" opacity="0.08"/>
  <!-- Site name -->
  <text x="80" y="80" font-family="sans-serif" font-size="22" fill="#52B788" opacity="0.8">ひなたぼっこぷらんつ - Plants Story</text>
  <!-- Type badge -->
  <rect x="80" y="200" width="${tc.label.length * 14 + 40}" height="40" rx="20" fill="${tc.color}"/>
  <text x="100" y="226" font-family="sans-serif" font-size="18" fill="#ffffff" font-weight="bold">${tc.label}</text>
  <!-- Cultivar name -->
  <text x="80" y="310" font-family="sans-serif" font-size="${fontSize}" fill="#F5F7F2" font-weight="bold">${escapeXml(truncated)}</text>
  <!-- Genus -->
  <text x="80" y="370" font-family="sans-serif" font-size="28" fill="#52B788" opacity="0.9">${escapeXml(genus)}</text>
  <!-- Tagline -->
  <text x="80" y="560" font-family="sans-serif" font-size="20" fill="#C8D0C0" opacity="0.6">品種の由来や歴史をコミュニティで収集・共有</text>
</svg>`;

    // Initialize WASM once
    if (!wasmInitialized) {
      await init();
      wasmInitialized = true;
    }

    // Convert SVG to PNG
    const png = svg2png(svg, { width: 1200 });

    return new Response(png, {
      headers: {
        ...corsHeaders(req),
        "Content-Type": "image/png",
        "Cache-Control": "public, max-age=86400, s-maxage=86400",
      },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders(req), "Content-Type": "application/json" },
    });
  }
});

function escapeXml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}
