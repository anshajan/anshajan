import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { stripeClient, isStripeConfigured, PRICE_BY_TIER } from "@/lib/stripe";
import { TIER_LIMITS, type Tier } from "@/lib/credits";

export const runtime = "nodejs";

function supabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL as string,
    process.env.SUPABASE_SERVICE_ROLE_KEY as string,
    { auth: { persistSession: false } }
  );
}

function tierForPriceId(priceId: string | undefined): Tier | null {
  if (!priceId) return null;
  if (priceId === PRICE_BY_TIER.creator) return "creator";
  if (priceId === PRICE_BY_TIER.agency) return "agency";
  return null;
}

/**
 * Verifies the Stripe signature on the RAW request body before trusting
 * anything in the payload — this is what stops an attacker from POSTing a
 * forged "subscription upgraded" event to grant themselves credits.
 */
export async function POST(req: Request) {
  if (!isStripeConfigured() || !process.env.STRIPE_WEBHOOK_SECRET) {
    return NextResponse.json({ error: "Webhook not configured." }, { status: 503 });
  }

  const signature = req.headers.get("stripe-signature");
  if (!signature) {
    return NextResponse.json({ error: "Missing signature." }, { status: 400 });
  }

  const rawBody = await req.text();
  let event;
  try {
    event = stripeClient().webhooks.constructEvent(
      rawBody,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    console.error("[webhook/stripe] signature verification failed", err);
    return NextResponse.json({ error: "Invalid signature." }, { status: 400 });
  }

  const hasDb = Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as any;
      const userId = session.client_reference_id as string | undefined;
      if (userId && hasDb) {
        const stripe = stripeClient();
        const lineItems = await stripe.checkout.sessions.listLineItems(session.id);
        const priceId = lineItems.data[0]?.price?.id;
        const tier = tierForPriceId(priceId);
        if (tier) {
          await supabaseAdmin()
            .from("profiles")
            .update({
              tier,
              credit_limit: TIER_LIMITS[tier].monthlyCredits,
              credits_used: 0,
              stripe_customer_id: session.customer,
              stripe_subscription_id: session.subscription,
            })
            .eq("id", userId);
        }
      }
      break;
    }
    case "customer.subscription.deleted": {
      const subscription = event.data.object as any;
      if (hasDb) {
        await supabaseAdmin()
          .from("profiles")
          .update({ tier: "free", credit_limit: TIER_LIMITS.free.monthlyCredits })
          .eq("stripe_subscription_id", subscription.id);
      }
      break;
    }
    default:
      break;
  }

  return NextResponse.json({ received: true });
}
