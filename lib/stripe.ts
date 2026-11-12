import Stripe from "stripe";

export function isStripeConfigured(): boolean {
  return Boolean(process.env.STRIPE_SECRET_KEY);
}

export function stripeClient(): Stripe {
  if (!process.env.STRIPE_SECRET_KEY) {
    throw new Error("STRIPE_SECRET_KEY is not configured.");
  }
  return new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: "2024-10-28.acacia" });
}

export const PRICE_BY_TIER: Record<"creator" | "agency", string | undefined> = {
  creator: process.env.NEXT_PUBLIC_STRIPE_PRICE_CREATOR,
  agency: process.env.NEXT_PUBLIC_STRIPE_PRICE_AGENCY,
};
