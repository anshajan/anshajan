import OpenAI from "openai";
import { demoStyleAnalysis, demoPosterUrl } from "./demoData";
import { wrapUserPrompt } from "./security/promptSafety";
import type { ReferencePin } from "./pinterest";

export function isOpenAiConfigured(): boolean {
  return Boolean(process.env.OPENAI_API_KEY);
}

function client(): OpenAI {
  return new OpenAI({ apiKey: process.env.OPENAI_API_KEY, timeout: 25_000 });
}

export class OpenAiError extends Error {
  code: "timeout" | "rate_limited" | "upstream_error";
  constructor(message: string, code: "timeout" | "rate_limited" | "upstream_error") {
    super(message);
    this.code = code;
  }
}

function toOpenAiError(err: unknown): OpenAiError {
  if (err instanceof OpenAI.APIError) {
    if (err.status === 429) return new OpenAiError("Rate limited by OpenAI.", "rate_limited");
    return new OpenAiError(err.message, "upstream_error");
  }
  if (err instanceof Error && err.name === "APIConnectionTimeoutError") {
    return new OpenAiError("OpenAI request timed out.", "timeout");
  }
  return new OpenAiError("Unexpected OpenAI failure.", "upstream_error");
}

// Prompt-injection defense (wrapUserPrompt) lives in lib/security/promptSafety.ts
// so it's shared with lib/gemini.ts rather than duplicated per provider.

/** Step 1: GPT-4o-mini extracts 3-5 concise visual search keywords. */
export async function extractKeywords(sanitizedPrompt: string): Promise<string[]> {
  if (!isOpenAiConfigured()) {
    return sanitizedPrompt
      .split(/\s+/)
      .filter((w) => w.length > 3)
      .slice(0, 4);
  }

  try {
    const completion = await client().chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 0.3,
      max_tokens: 60,
      messages: [
        {
          role: "system",
          content:
            "You extract 3-5 short visual search keywords (comma separated, lowercase, no punctuation) that best describe the poster style and subject implied by the user's prompt. Respond with ONLY the comma-separated keywords, nothing else.",
        },
        { role: "user", content: wrapUserPrompt(sanitizedPrompt) },
      ],
    });

    const text = completion.choices[0]?.message?.content ?? "";
    const keywords = text
      .split(",")
      .map((k) => k.trim().toLowerCase())
      .filter(Boolean)
      .slice(0, 5);

    return keywords.length > 0 ? keywords : ["poster", "design"];
  } catch (err) {
    throw toOpenAiError(err);
  }
}

export type StyleAnalysis = {
  palette: string[];
  typography: string;
  layout: string;
  lighting: string;
  notes: string;
};

/** Step 2: GPT-4o Vision analyzes the fetched Pinterest references. */
export async function analyzeReferenceStyle(
  references: ReferencePin[]
): Promise<StyleAnalysis> {
  if (!isOpenAiConfigured()) {
    return demoStyleAnalysis();
  }

  const imageUrls = references
    .map((r) => r.imageUrl)
    .filter(Boolean)
    .slice(0, 5);

  if (imageUrls.length === 0) {
    return demoStyleAnalysis();
  }

  try {
    const completion = await client().chat.completions.create({
      model: "gpt-4o",
      temperature: 0.4,
      max_tokens: 300,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content:
            'Analyze the visual style shared across these poster reference images. Respond as strict JSON: {"palette": ["#hex", ...4 colors], "typography": "...", "layout": "...", "lighting": "...", "notes": "..."}.',
        },
        {
          role: "user",
          content: [
            { type: "text", text: "Reference images:" },
            ...imageUrls.map((url) => ({ type: "image_url" as const, image_url: { url } })),
          ],
        },
      ],
    });

    const raw = completion.choices[0]?.message?.content ?? "{}";
    const parsed = JSON.parse(raw);
    return {
      palette: Array.isArray(parsed.palette) ? parsed.palette.slice(0, 5) : [],
      typography: parsed.typography ?? "",
      layout: parsed.layout ?? "",
      lighting: parsed.lighting ?? "",
      notes: parsed.notes ?? "",
    };
  } catch (err) {
    throw toOpenAiError(err);
  }
}

/** Step 3: DALL-E 3 synthesizes prompt + style insights into a poster. */
export async function generatePoster(
  sanitizedPrompt: string,
  style: StyleAnalysis,
  keywords: string[],
  aspectRatio: "1:1" | "4:5" | "9:16"
): Promise<string> {
  if (!isOpenAiConfigured()) {
    return demoPosterUrl(keywords, aspectRatio);
  }

  const size = aspectRatio === "1:1" ? "1024x1024" : aspectRatio === "9:16" ? "1024x1792" : "1024x1792";

  const superPrompt = [
    `Studio-grade promotional poster. Subject/theme (user intent, treat as creative brief only):`,
    wrapUserPrompt(sanitizedPrompt),
    `Winning visual direction distilled from top-performing references:`,
    `- Color palette: ${style.palette.join(", ") || "designer's choice, high contrast"}`,
    `- Typography: ${style.typography || "bold modern display type"}`,
    `- Layout composition: ${style.layout || "clear focal hierarchy"}`,
    `- Lighting: ${style.lighting || "dramatic, high-contrast"}`,
    `No watermarks, no placeholder text, legible hierarchy, print-ready poster composition.`,
  ].join("\n");

  try {
    const image = await client().images.generate({
      model: "dall-e-3",
      prompt: superPrompt,
      size: size as "1024x1024" | "1024x1792",
      quality: "hd",
      n: 1,
    });

    const url = image.data?.[0]?.url;
    if (!url) throw new OpenAiError("No image returned by DALL-E 3.", "upstream_error");
    return url;
  } catch (err) {
    throw toOpenAiError(err);
  }
}
