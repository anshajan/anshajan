/**
 * Shared security headers applied by middleware.ts to every response, and
 * the CORS allowlist check used by API routes. Centralized so the policy
 * can't drift between routes.
 */

export const SECURITY_HEADERS: Record<string, string> = {
  "X-Frame-Options": "DENY",
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
  "Strict-Transport-Security": "max-age=63072000; includeSubDomains; preload",
  "Content-Security-Policy": [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline'",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: https://i.pinimg.com https://*.oaiusercontent.com",
    "connect-src 'self' https://api.openai.com https://api.pinterest.com https://*.supabase.co",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
  ].join("; "),
};

export function allowedOrigins(): string[] {
  return (process.env.ALLOWED_ORIGINS ?? "http://localhost:3000")
    .split(",")
    .map((o) => o.trim())
    .filter(Boolean);
}

/**
 * `requestUrl` is the incoming request's own URL (`req.url`). Browsers send
 * an `Origin` header on same-origin POST/PUT/DELETE fetches too, not just
 * cross-origin ones — so without this, a deployment's own frontend calling
 * its own `/api/*` route gets rejected as "foreign" unless someone remembers
 * to add that exact deployment URL to ALLOWED_ORIGINS. That's exactly the
 * footgun that hit the first Vercel deploy of this app: the production
 * domain was never added, so every same-site call 403'd. Treating the
 * request's own origin as always-allowed closes that gap for every current
 * and future deployment URL (prod, preview, custom domain) with no config
 * required; ALLOWED_ORIGINS is then only for genuinely separate origins
 * (e.g. a different marketing site calling this API).
 */
export function isOriginAllowed(origin: string | null, requestUrl?: string): boolean {
  if (!origin) return true; // no Origin header at all — nothing to check
  if (requestUrl && origin === new URL(requestUrl).origin) return true;
  return allowedOrigins().includes(origin);
}

export function corsHeadersFor(origin: string | null, requestUrl?: string): Record<string, string> {
  if (!origin || !isOriginAllowed(origin, requestUrl)) return {};
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    Vary: "Origin",
  };
}
