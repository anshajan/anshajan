import {
  extractKeywords as extractKeywordsOpenAi,
  analyzeReferenceStyle as analyzeReferenceStyleOpenAi,
  generatePoster as generatePosterOpenAi,
  OpenAiError,
  isOpenAiConfigured,
  type StyleAnalysis,
} from "./openai";
import {
  extractKeywordsGemini,
  analyzeReferenceStyleGemini,
  generatePosterGemini,
  isGeminiConfigured,
  GeminiError,
} from "./gemini";
import type { ReferencePin } from "./pinterest";

export type { StyleAnalysis };

/**
 * Single place that decides which AI provider actually runs the pipeline.
 * Gemini takes priority when configured (it's the one with real,
 * verified-working credentials as of this integration); OpenAI is the
 * fallback for anyone who configures that instead; each provider module
 * already falls back to demo fixtures internally when its own key is
 * unset, so "demo" needs no explicit branch here.
 */
export type AiProvider = "gemini" | "openai" | "demo";

export function activeProvider(): AiProvider {
  if (isGeminiConfigured()) return "gemini";
  if (isOpenAiConfigured()) return "openai";
  return "demo";
}

export class AiProviderError extends Error {
  code: "timeout" | "rate_limited" | "quota_exceeded" | "upstream_error";
  constructor(message: string, code: AiProviderError["code"]) {
    super(message);
    this.code = code;
  }
}

/** Collapses GeminiError/OpenAiError into one shape for route.ts to handle; anything else passes through untouched. */
function normalize(err: unknown): unknown {
  if (err instanceof GeminiError || err instanceof OpenAiError) {
    return new AiProviderError(err.message, err.code as AiProviderError["code"]);
  }
  return err;
}

export async function extractKeywords(sanitizedPrompt: string): Promise<string[]> {
  try {
    return isGeminiConfigured()
      ? await extractKeywordsGemini(sanitizedPrompt)
      : await extractKeywordsOpenAi(sanitizedPrompt);
  } catch (err) {
    throw normalize(err);
  }
}

export async function analyzeReferenceStyle(references: ReferencePin[]): Promise<StyleAnalysis> {
  try {
    return isGeminiConfigured()
      ? await analyzeReferenceStyleGemini(references)
      : await analyzeReferenceStyleOpenAi(references);
  } catch (err) {
    throw normalize(err);
  }
}

export async function generatePoster(
  sanitizedPrompt: string,
  style: StyleAnalysis,
  keywords: string[],
  aspectRatio: "1:1" | "4:5" | "9:16"
): Promise<string> {
  try {
    return isGeminiConfigured()
      ? await generatePosterGemini(sanitizedPrompt, style, keywords, aspectRatio)
      : await generatePosterOpenAi(sanitizedPrompt, style, keywords, aspectRatio);
  } catch (err) {
    throw normalize(err);
  }
}
