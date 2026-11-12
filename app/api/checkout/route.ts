import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { checkoutRequestSchema } from "@/lib/security/schemas";
import { corsHeadersFor, isOriginAllowed } from "@/lib/security/headers";
import { checkRateLimit, clientIdentifierFromRequest } from "@/lib/security/rateLimit";
import { getAuthedUser } from "@/lib/security/auth";
import { isStripeConfigured, stripeClient, PRICE_BY_TIER } from "@/lib/stripe";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const origin = req.headers.get("origin");
  if (!isOriginAllowed(origin, req.url)) {
    return NextResponse.json({ error: "Origin not allowed." }, { status: 403 });
  }

  const user = await getAuthedUser(req);
  if (!user) {
    return NextResponse.json(
      { error: "Sign in required." },
      { status: 401, headers: corsHeadersFor(origin, req.url) }
    );
  }

  const { allowed } = await checkRateLimit(clientIdentifierFromRequest(req, user.id));
  if (!allowed) {
    return NextResponse.json(
      { error: "Too many requests." },
      { status: 429, headers: corsHeadersFor(origin, req.url) }
    );
  }

  let parsed;
  try {
    parsed = checkoutRequestSchema.parse(await req.json());
  } catch (err) {
    const message = err instanceof ZodError ? err.issues[0]?.message : "Invalid request.";
    return NextResponse.json(
      { error: message ?? "Invalid request." },
      { status: 400, headers: corsHeadersFor(origin, req.url) }
    );
  }

  if (!isStripeConfigured()) {
    return NextResponse.json(
      { error: "Billing isn't configured yet. Set STRIPE_SECRET_KEY to enable checkout." },
      { status: 503, headers: corsHeadersFor(origin, req.url) }
    );
  }

  const priceId = PRICE_BY_TIER[parsed.tier];
  if (!priceId) {
    return NextResponse.json(
      { error: `No Stripe price configured for the ${parsed.tier} tier.` },
      { status: 503, headers: corsHeadersFor(origin, req.url) }
    );
  }

  try {
    const stripe = stripeClient();
    // The request's own origin is the most reliable redirect target — it's
    // always the real deployment URL (prod/preview/custom domain) as seen
    // by this request, unlike ALLOWED_ORIGINS which may be unset or stale.
    const siteUrl = origin ?? new URL(req.url).origin;

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      line_items: [{ price: priceId, quantity: 1 }],
      client_reference_id: user.id,
      customer_email: user.email ?? undefined,
      success_url: `${siteUrl}/?checkout=success`,
      cancel_url: `${siteUrl}/?checkout=cancelled`,
    });

    return NextResponse.json({ url: session.url }, { headers: corsHeadersFor(origin, req.url) });
  } catch (err) {
    console.error("[/api/checkout] stripe error", err);
    return NextResponse.json(
      { error: "Could not start checkout." },
      { status: 502, headers: corsHeadersFor(origin, req.url) }
    );
  }
}
