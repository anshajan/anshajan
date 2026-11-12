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

  const res = await fetch(`${base}/search/pins?query=${query}&page_size=5`, {
    headers: {
      Authorization: `Bearer ${process.env.PINTEREST_ACCESS_TOKEN}`,
    },
    // Pinterest responses are personalized per search; never cache across users.
    cache: "no-store",
  });

  if (!res.ok) {
    throw new PinterestError(
      `Pinterest API returned ${res.status}`,
      res.status === 429 ? "rate_limited" : "upstream_error"
    );
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
