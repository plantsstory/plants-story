# Cloudflare Security Headers Configuration

Set these headers via Cloudflare Dashboard > Rules > Transform Rules > Modify Response Header.

## Required Headers

| Header | Value | Purpose |
|--------|-------|---------|
| `Strict-Transport-Security` | `max-age=31536000; includeSubDomains; preload` | HTTPS enforcement |
| `X-Content-Type-Options` | `nosniff` | Prevent MIME sniffing |
| `X-Frame-Options` | `SAMEORIGIN` | Prevent clickjacking |
| `Permissions-Policy` | `camera=(), microphone=(), geolocation=()` | Disable unused APIs |

## How to Configure

1. Cloudflare Dashboard > plantsstory.com
2. Rules > Transform Rules > Create Rule
3. Name: "Security Headers"
4. When: All incoming requests (or URI Path matches `/`)
5. Then: Set each header above as "Set static" response headers
