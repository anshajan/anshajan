import { createClient } from "@supabase/supabase-js";

export type AuthedUser = { id: string; email: string | null };

/**
 * Verifies the Supabase session JWT sent in the Authorization header on
 * every /api/generate call. Returns null (never throws) for a missing or
 * invalid token so callers can fall back to the anonymous demo flow.
 *
 * Deliberately re-validates server-side on every request rather than
 * trusting a client-supplied userId — the credit deduction in lib/credits.ts
 * depends on this identity being authentic.
 */
export async function getAuthedUser(req: Request): Promise<AuthedUser | null> {
  const authHeader = req.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) return null;

  const token = authHeader.slice("Bearer ".length).trim();
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey || !token) return null;

  try {
    const supabase = createClient(url, anonKey);
    const { data, error } = await supabase.auth.getUser(token);
    if (error || !data.user) return null;
    return { id: data.user.id, email: data.user.email ?? null };
  } catch {
    return null;
  }
}
