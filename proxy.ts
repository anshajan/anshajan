import { NextResponse, type NextRequest } from "next/server";
import { SECURITY_HEADERS } from "@/lib/security/headers";

/**
 * Applies the security header set to EVERY response (pages and API routes
 * alike) in one place, so an individual route can't accidentally ship
 * without CSP/X-Frame-Options/etc. Route-specific CORS headers are added
 * separately inside each API route (see lib/security/headers.ts).
 *
 * Named/filed as `proxy` (not `middleware`) per the Next.js 16 convention
 * rename — see https://nextjs.org/docs/app/api-reference/file-conventions/proxy.
 */
export function proxy(request: NextRequest) {
  const response = NextResponse.next();
  for (const [key, value] of Object.entries(SECURITY_HEADERS)) {
    response.headers.set(key, value);
  }
  return response;
}

export const config = {
  matcher: "/((?!_next/static|_next/image|favicon.ico).*)",
};
