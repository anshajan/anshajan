import { createClient } from "@supabase/supabase-js";

export const TIER_LIMITS = {
  free: { monthlyCredits: 3, label: "Starter" },
  creator: { monthlyCredits: 60, label: "Creator Pro" },
  agency: { monthlyCredits: 250, label: "Agency / Studio" },
} as const;

export type Tier = keyof typeof TIER_LIMITS;

function hasSupabaseAdmin() {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY
  );
}

function supabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL as string,
    process.env.SUPABASE_SERVICE_ROLE_KEY as string,
    { auth: { persistSession: false } }
  );
}

// In-memory anonymous/demo quota, keyed by IP, reset per process lifetime.
// This exists only so the sandbox experience has *some* gate to demonstrate
// the UX; it is not a substitute for the database-backed check below and
// must never be relied on for a real paying tier.
const anonymousUsage = new Map<string, number>();

export type CreditCheckResult =
  | { ok: true; remainingAfter: number; tier: Tier }
  | { ok: false; reason: "no_credits"; tier: Tier };

/**
 * Atomically checks-and-deducts one credit BEFORE any paid OpenAI/Pinterest
 * call is made. Using a single conditional UPDATE (via the Postgres RPC
 * below) instead of a separate "read credits" + "write credits" step closes
 * the race window where two concurrent requests could both read "1 credit
 * left" and both proceed, draining the account below zero.
 *
 * SQL backing this call (see supabase/schema.sql `deduct_credit`):
 *   UPDATE profiles SET credits_used = credits_used + 1
 *   WHERE id = $1 AND credits_used < credit_limit
 *   RETURNING credit_limit - credits_used AS remaining;
 */
export async function deductCredit(
  userId: string | null,
  anonymousKey: string
): Promise<CreditCheckResult> {
  if (!userId || !hasSupabaseAdmin()) {
    // Anonymous / demo-mode path — enforce the free-tier monthly quota
    // in-memory so the pipeline and upgrade modal can be exercised without
    // a database configured.
    const used = anonymousUsage.get(anonymousKey) ?? 0;
    if (used >= TIER_LIMITS.free.monthlyCredits) {
      return { ok: false, reason: "no_credits", tier: "free" };
    }
    anonymousUsage.set(anonymousKey, used + 1);
    return {
      ok: true,
      remainingAfter: TIER_LIMITS.free.monthlyCredits - used - 1,
      tier: "free",
    };
  }

  const supabase = supabaseAdmin();
  const { data, error } = await supabase.rpc("deduct_credit", { p_user_id: userId });

  if (error || !data || data.length === 0) {
    return { ok: false, reason: "no_credits", tier: "free" };
  }

  const row = data[0] as { remaining: number; tier: Tier };
  return { ok: true, remainingAfter: row.remaining, tier: row.tier };
}

/** Refunds a credit if the pipeline fails after the deduction succeeded. */
export async function refundCredit(userId: string | null): Promise<void> {
  if (!userId || !hasSupabaseAdmin()) return;
  const supabase = supabaseAdmin();
  await supabase.rpc("refund_credit", { p_user_id: userId });
}
