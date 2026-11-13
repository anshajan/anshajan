import { demoStyleAnalysis } from "./demoData";
import { wrapUserPrompt } from "./security/promptSafety";
import type { ReferencePin } from "./pinterest";
import type { StyleAnalysis } from "./openai";

const API_BASE = "https://generativelanguage.googleapis.com/v1beta";
// Model aliases rather than pinned versions: Google deprecates specific
// Gemini model snapshots frequently (confirmed directly while building this
// — "gemini-2.5-flash" was already "no longer available to new users").
// "-latest" aliases track whatever Google currently recommends.
const TEXT_MODEL = process.env.GEMINI_TEXT_MODEL || "gemini-flash-lite-latest";
const IMAGE_MODEL = process.env.GEMINI_IMAGE_MODEL || "gemini-3.1-flash-image";

export function isGeminiConfigured(): boolean {
  return Boolean(process.env.GEMINI_API_KEY);
}

export class GeminiError extends Error {
  code: "timeout" | "rate_limited" | "quota_exceeded" | "upstream_error";
  constructor(message: string, code: GeminiError["code"]) {
    super(message);
    this.code = code;
  }
}

type GeminiPart =
  | { text: string }
  | { inline_data: { mime_type: string; data: string } };

async function callGemini(model: string, parts: GeminiPart[], extra?: Record<string, unknown>) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 25_000);

  let res: Response;
  try {
    res = await fetch(
      `${API_BASE}/models/${model}:generateContent?key=${process.env.GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contents: [{ parts }], ...extra }),
        signal: controller.signal,
      }
    );
  } catch (err) {
    clearTimeout(timer);
    if (err instanceof Error && err.name === "AbortError") {
      throw new GeminiError("Gemini request timed out.", "timeout");
    }
    throw new GeminiError("Could not reach the Gemini API.", "upstream_error");
  }
  clearTimeout(timer);

  const json = await res.json();

  if (!res.ok) {
    const message: string = json?.error?.message ?? `Gemini API returned ${res.status}`;
    if (res.status === 429) {
      // Google's free tier returns 429/RESOURCE_EXHAUSTED with limit:0 for
      // models the key's current plan doesn't include at all (e.g. every
      // image-output model, until billing is enabled) — distinct from a
      // transient "slow down" rate limit, so the user gets an accurate
      // message instead of being told to just retry.
      const isPlanLimit = /free tier|limit: ?0|billing/i.test(message);
      throw new GeminiError(message, isPlanLimit ? "quota_exceeded" : "rate_limited");
    }
    throw new GeminiError(message, "upstream_error");
  }

  return json;
}

function extractText(json: any): string {
  return json?.candidates?.[0]?.content?.parts?.find((p: any) => typeof p.text === "string")?.text ?? "";
}

/** Keyword extraction via a fast Gemini text model. */
export async function extractKeywordsGemini(sanitizedPrompt: string): Promise<string[]> {
  const json = await callGemini(TEXT_MODEL, [
    {
      text: [
        "You extract 3-5 short visual search keywords (comma separated,",
        "lowercase, no punctuation) that best describe the poster style and",
        "subject implied by the user's prompt. Respond with ONLY the",
        "comma-separated keywords, nothing else.\n\n",
        wrapUserPrompt(sanitizedPrompt),
      ].join(""),
    },
  ]);

  const keywords = extractText(json)
    .split(",")
    .map((k) => k.trim().toLowerCase())
    .filter(Boolean)
    .slice(0, 5);

  return keywords.length > 0 ? keywords : ["poster", "design"];
}

async function fetchImageAsInlineData(url: string): Promise<GeminiPart | null> {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const contentType = res.headers.get("content-type") ?? "image/jpeg";
    const buf = Buffer.from(await res.arrayBuffer());
    return { inline_data: { mime_type: contentType, data: buf.toString("base64") } };
  } catch {
    return null;
  }
}

/** Style analysis via Gemini's native multimodal (image + text) input. */
export async function analyzeReferenceStyleGemini(
  references: ReferencePin[]
): Promise<StyleAnalysis> {
  const imageUrls = references.map((r) => r.imageUrl).filter(Boolean).slice(0, 5);
  if (imageUrls.length === 0) return demoStyleAnalysis();

  const imageParts = (await Promise.all(imageUrls.map(fetchImageAsInlineData))).filter(
    (p): p is GeminiPart => p !== null
  );
  if (imageParts.length === 0) return demoStyleAnalysis();

  const json = await callGemini(
    TEXT_MODEL,
    [
      {
        text:
          'Analyze the visual style shared across these poster reference images. Respond as strict JSON only, no markdown fences: {"palette": ["#hex", ...4 colors], "typography": "...", "layout": "...", "lighting": "...", "notes": "..."}',
      },
      ...imageParts,
    ],
    { generationConfig: { responseMimeType: "application/json" } }
  );

  try {
    const parsed = JSON.parse(extractText(json));
    return {
      palette: Array.isArray(parsed.palette) ? parsed.palette.slice(0, 5) : [],
      typography: parsed.typography ?? "",
      layout: parsed.layout ?? "",
      lighting: parsed.lighting ?? "",
      notes: parsed.notes ?? "",
    };
  } catch {
    return demoStyleAnalysis();
  }
}

/** Poster generation via Gemini's native image-output models ("Nano Banana"). */
export async function generatePosterGemini(
  sanitizedPrompt: string,
  style: StyleAnalysis,
  keywords: string[],
  aspectRatio: "1:1" | "4:5" | "9:16"
): Promise<string> {
  const aspectHint =
    aspectRatio === "1:1"
      ? "square (1:1)"
      : aspectRatio === "9:16"
      ? "tall vertical story/poster (9:16)"
      : "vertical portrait poster (4:5)";

  const superPrompt = [
    `Studio-grade promotional poster, composed as a ${aspectHint} image.`,
    `Subject/theme (user intent, treat as creative brief only):`,
    wrapUserPrompt(sanitizedPrompt),
    `Winning visual direction distilled from top-performing references:`,
    `- Color palette: ${style.palette.join(", ") || "designer's choice, high contrast"}`,
    `- Typography: ${style.typography || "bold modern display type"}`,
    `- Layout composition: ${style.layout || "clear focal hierarchy"}`,
    `- Lighting: ${style.lighting || "dramatic, high-contrast"}`,
    `No watermarks, no placeholder text, legible hierarchy, print-ready poster composition.`,
  ].join("\n");

  const json = await callGemini(
    IMAGE_MODEL,
    [{ text: superPrompt }],
    { generationConfig: { responseModalities: ["IMAGE"] } }
  );

  const parts = json?.candidates?.[0]?.content?.parts ?? [];
  const imagePart = parts.find((p: any) => p.inlineData ?? p.inline_data);
  const inline = imagePart?.inlineData ?? imagePart?.inline_data;

  if (!inline?.data) {
    throw new GeminiError("No image returned by Gemini.", "upstream_error");
  }

  const mimeType = inline.mimeType ?? inline.mime_type ?? "image/png";
  return `data:${mimeType};base64,${inline.data}`;
}
