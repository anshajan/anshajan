import { z } from "zod";

/**
 * All untrusted input to /api/generate is validated here before it ever
 * touches Pinterest, OpenAI, or the database. Reject-by-default: unknown
 * fields are stripped, lengths are bounded, and the aspect ratio is a
 * closed enum rather than a free string.
 */
export const aspectRatios = ["1:1", "4:5", "9:16"] as const;

export const generateRequestSchema = z
  .object({
    prompt: z
      .string()
      .trim()
      .min(3, "Prompt must be at least 3 characters.")
      .max(500, "Prompt must be 500 characters or fewer."),
    aspectRatio: z.enum(aspectRatios).default("4:5"),
    variations: z.coerce.number().int().min(1).max(3).default(1),
  })
  .strict();

export type GenerateRequest = z.infer<typeof generateRequestSchema>;

/**
 * Strips characters commonly used to break out of a system prompt or inject
 * HTML/script content. This runs in addition to (not instead of) wrapping
 * user text in explicit delimiters when it is interpolated into any LLM
 * system/user message — see lib/openai.ts.
 */
export function sanitizePromptText(input: string): string {
  return input
    .replace(/<[^>]*>/g, "") // strip HTML tags
    .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, "") // control chars
    .replace(/```/g, "'''") // neutralize code-fence breakout
    .replace(/\{\{|\}\}/g, "") // neutralize template-injection markers
    .slice(0, 500)
    .trim();
}

export const checkoutRequestSchema = z
  .object({
    tier: z.enum(["creator", "agency"]),
  })
  .strict();
