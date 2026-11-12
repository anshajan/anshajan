/**
 * Sandbox fixtures used whenever OPENAI_API_KEY or PINTEREST_ACCESS_TOKEN
 * is unset. This lets the full pipeline — including the progress tracker,
 * split result view, and credit gating — run end-to-end with zero external
 * API keys configured, which is what `npm run dev` gives you out of the box.
 */

export type DemoPin = {
  id: string;
  imageUrl: string;
  title: string;
  engagement: number;
};

export function demoReferencePins(keywords: string[]): DemoPin[] {
  const seedColors = ["ff5a3c", "1e222b", "f4c95d", "2a9d8f", "6a4c93"];
  return Array.from({ length: 4 }, (_, i) => ({
    id: `demo-pin-${i}`,
    imageUrl: `https://placehold.co/480x600/${seedColors[i % seedColors.length]}/ffffff?text=${encodeURIComponent(
      keywords[0] ?? "Poster"
    )}+${i + 1}`,
    title: `${keywords[0] ?? "Poster"} reference ${i + 1}`,
    engagement: Math.round(1200 - i * 180 + Math.random() * 60),
  }));
}

export function demoStyleAnalysis() {
  return {
    palette: ["#FF5A3C", "#15181F", "#F4C95D", "#FFFFFF"],
    typography: "Bold condensed display headline, light tracked subhead",
    layout: "Centered subject, headline upper third, CTA bottom band",
    lighting: "High-contrast directional light with warm rim light",
    notes:
      "Demo-mode style analysis — connect OPENAI_API_KEY to run real GPT-4o Vision analysis on the fetched Pinterest references.",
  };
}

export function demoPosterUrl(keywords: string[], aspectRatio: string): string {
  const size = aspectRatio === "9:16" ? "720x1280" : aspectRatio === "1:1" ? "800x800" : "800x1000";
  return `https://placehold.co/${size}/0d0f14/ffffff?text=${encodeURIComponent(
    `${keywords[0] ?? "anshaj"} poster\n(demo mode)`
  )}`;
}
