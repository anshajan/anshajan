import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { generateRequestSchema, sanitizePromptText } from "@/lib/security/schemas";
import { checkRateLimit, clientIdentifierFromRequest } from "@/lib/security/rateLimit";
import { corsHeadersFor, isOriginAllowed } from "@/lib/security/headers";
import { getAuthedUser } from "@/lib/security/auth";
import { deductCredit, refundCredit } from "@/lib/credits";
import { extractKeywords, analyzeReferenceStyle, generatePoster, activeProvider, AiProviderError } from "@/lib/aiProvider";
import { fetchPinterestReferences, PinterestError } from "@/lib/pinterest";

export const runtime = "nodejs";

function jsonError(status: number, message: string, origin: string | null, requestUrl: string) {
  return NextResponse.json(
    { error: message },
    { status, headers: corsHeadersFor(origin, requestUrl) }
  );
}

export async function OPTIONS(req: Request) {
  const origin = req.headers.get("origin");
  return new NextResponse(null, { status: 204, headers: corsHeadersFor(origin, req.url) });
}

export async function POST(req: Request) {
  const origin = req.headers.get("origin");

  // CORS allowlist — reject cross-origin calls from hosts we didn't approve
  // before doing any other work (credit-safe fail-fast). The deployment's
  // own origin (prod, preview, or custom domain) is always allowed; see
  // isOriginAllowed in lib/security/headers.ts for why.
  if (!isOriginAllowed(origin, req.url)) {
    return jsonError(403, "Origin not allowed.", origin, req.url);
  }

  // Every request is identified by authed user OR by IP for rate limiting
  // and the anonymous demo quota, never by a client-supplied id.
  const user = await getAuthedUser(req);
  const identifier = clientIdentifierFromRequest(req, user?.id);

  const { allowed } = await checkRateLimit(identifier);
  if (!allowed) {
    return jsonError(429, "Too many requests. Please slow down and try again shortly.", origin, req.url);
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return jsonError(400, "Request body must be valid JSON.", origin, req.url);
  }

  let parsed;
  try {
    parsed = generateRequestSchema.parse(body);
  } catch (err) {
    if (err instanceof ZodError) {
      return jsonError(400, err.issues[0]?.message ?? "Invalid request.", origin, req.url);
    }
    return jsonError(400, "Invalid request.", origin, req.url);
  }

  const sanitizedPrompt = sanitizePromptText(parsed.prompt);
  if (sanitizedPrompt.length < 3) {
    return jsonError(400, "Prompt is empty after sanitization. Try a more descriptive prompt.", origin, req.url);
  }

  // Credit check-and-deduct happens BEFORE any OpenAI/Pinterest call so a
  // user can never trigger a billed generation without the balance for it,
  // and so concurrent requests can't race past the limit (see lib/credits.ts).
  const credit = await deductCredit(user?.id ?? null, identifier);
  if (!credit.ok) {
    return jsonError(
      402,
      "You've used all your free generations this month. Upgrade to continue.",
      origin,
      req.url
    );
  }

  try {
    const keywords = await extractKeywords(sanitizedPrompt);
    const references = await fetchPinterestReferences(keywords);
    const style = await analyzeReferenceStyle(references);
    const posterUrl = await generatePoster(sanitizedPrompt, style, keywords, parsed.aspectRatio);

    return NextResponse.json(
      {
        keywords,
        references,
        style,
        posterUrl,
        aspectRatio: parsed.aspectRatio,
        provider: activeProvider(),
        credits: { tier: credit.tier, remaining: credit.remainingAfter },
      },
      { headers: corsHeadersFor(origin, req.url) }
    );
  } catch (err) {
    // Pipeline failed after the credit was spent — refund it rather than
    // charging the user for a generation they never received.
    await refundCredit(user?.id ?? null, identifier);

    if (err instanceof PinterestError) {
      const msg =
        err.code === "rate_limited"
          ? "Pinterest is rate-limiting us right now. Please try again in a minute."
          : "Couldn't fetch Pinterest references right now. Please try again shortly.";
      return jsonError(503, msg, origin, req.url);
    }
    if (err instanceof AiProviderError) {
      const msg =
        err.code === "timeout"
          ? "Poster generation timed out. Please try again."
          : err.code === "rate_limited"
          ? "We're generating a lot of posters right now — please try again in a minute."
          : err.code === "quota_exceeded"
          ? "Image generation isn't enabled on this AI plan yet — check your provider's billing/plan settings."
          : "Poster generation failed. Please try again.";
      return jsonError(503, msg, origin, req.url);
    }

    console.error("[/api/generate] unexpected error", err);
    return jsonError(500, "Something went wrong generating your poster.", origin, req.url);
  }
}
