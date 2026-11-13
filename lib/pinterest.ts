import { demoReferencePins, type DemoPin } from "./demoData";

export type ReferencePin = DemoPin;

export function isPinterestConfigured(): boolean {
  return Boolean(process.env.PINTEREST_ACCESS_TOKEN);
}

/**
 * Fetches top-engaged pins matching the extracted keywords via Pinterest
 * API v5. The access token is read server-side only (never imported from a
 * "use client" module) so it can never end up in the browser bundle.
 */
export async function fetchPinterestReferences(
  keywords: string[]
): Promise<ReferencePin[]> {
  if (!isPinterestConfigured()) {
    return demoReferencePins(keywords);
  }

  const base = process.env.PINTEREST_API_BASE ?? "https://api.pinterest.com/v5";
  const query = encodeURIComponent(keywords.join(" "));

  let res: Response;
  try {
    res = await fetch(`${base}/search/pins?query=${query}&page_size=5`, {
      headers: {
        Authorization: `Bearer ${process.env.PINTEREST_ACCESS_TOKEN}`,
      },
      // Pinterest responses are personalized per search; never cache across users.
      cache: "no-store",
      signal: AbortSignal.timeout(10_000),
    });
  } catch (err) {
    console.warn(`[pinterest] network error, falling back to demo references: ${err}`);
    return demoReferencePins(keywords);
  }

  if (!res.ok) {
    if (res.status === 429) {
      // Transient and user-actionable ("try again shortly") — worth
      // surfacing rather than hiding behind a silent fallback.
      throw new PinterestError(`Pinterest API returned ${res.status}`, "rate_limited");
    }

    // Anything else (401/403/404/5xx) is an app-level or account-level
    // problem the user can't fix by retrying — e.g. this integration hit
    // "Your application consumer type is not supported" on every v5
    // endpoint while building this, which means the Pinterest app itself
    // isn't approved for live API access yet. Pinterest references are an
    // enrichment, not the core feature, so a misconfigured/unapproved app
    // should degrade to demo references rather than break poster
    // generation entirely. Logged server-side so it's still diagnosable.
    const body = await res.text().catch(() => "");
    console.warn(
      `[pinterest] API call failed (${res.status}), falling back to demo references: ${body.slice(0, 300)}`
    );
    return demoReferencePins(keywords);
  }

  const json = await res.json();
  const items = Array.isArray(json.items) ? json.items : [];

  if (items.length === 0) {
    // Graceful empty-results handling — fall back to demo references rather
    // than surfacing a dead end to the user.
    return demoReferencePins(keywords);
  }

  return items.slice(0, 5).map((pin: any, i: number) => ({
    id: String(pin.id ?? `pin-${i}`),
    imageUrl: pin.media?.images?.["600x"]?.url ?? pin.media?.images?.original?.url ?? "",
    title: pin.title ?? pin.alt_text ?? keywords[0] ?? "Reference pin",
    engagement: Number(pin.pin_metrics?.save_count ?? 0),
  }));
}

export class PinterestError extends Error {
  code: "rate_limited" | "upstream_error";
  constructor(message: string, code: "rate_limited" | "upstream_error") {
    super(message);
    this.code = code;
  }
}
