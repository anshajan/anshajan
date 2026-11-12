/**
 * Token-bucket rate limiting with an optional Upstash Redis backend.
 *
 * Why a bucket per (ip, userId) key rather than per-IP only: a shared
 * office/NAT IP would otherwise throttle every tenant behind it together.
 * Why Redis is optional: single-instance deployments don't need external
 * state, but anything horizontally scaled MUST set UPSTASH_REDIS_REST_URL —
 * the in-memory fallback does not coordinate across processes/instances.
 */

type BucketState = { tokens: number; lastRefill: number };

const buckets = new Map<string, BucketState>();

const CAPACITY = 20; // max burst
const REFILL_PER_MS = 10 / (60 * 1000); // 10 tokens/minute

function takeTokenInMemory(key: string): { allowed: boolean; remaining: number } {
  const now = Date.now();
  const bucket = buckets.get(key) ?? { tokens: CAPACITY, lastRefill: now };

  const elapsed = now - bucket.lastRefill;
  bucket.tokens = Math.min(CAPACITY, bucket.tokens + elapsed * REFILL_PER_MS);
  bucket.lastRefill = now;

  if (bucket.tokens >= 1) {
    bucket.tokens -= 1;
    buckets.set(key, bucket);
    return { allowed: true, remaining: Math.floor(bucket.tokens) };
  }

  buckets.set(key, bucket);
  return { allowed: false, remaining: 0 };
}

async function takeTokenRedis(
  key: string,
  url: string,
  token: string
): Promise<{ allowed: boolean; remaining: number }> {
  // Fixed-window fallback implemented over Upstash's REST API via simple
  // INCR + EXPIRE, which is sufficient for abuse protection without pulling
  // in the full @upstash/ratelimit dependency.
  const windowSeconds = 60;
  const limit = 10;
  const bucketKey = `ratelimit:${key}:${Math.floor(Date.now() / (windowSeconds * 1000))}`;

  const res = await fetch(`${url}/pipeline`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify([
      ["INCR", bucketKey],
      ["EXPIRE", bucketKey, windowSeconds.toString()],
    ]),
  });

  if (!res.ok) {
    // Fail open to in-memory rather than fail closed on the entire API.
    return takeTokenInMemory(key);
  }

  const [incrResult] = (await res.json()) as [{ result: number }];
  const count = incrResult.result;
  return { allowed: count <= limit, remaining: Math.max(0, limit - count) };
}

export async function checkRateLimit(
  identifier: string
): Promise<{ allowed: boolean; remaining: number }> {
  const key = `anshaj:${identifier}`;
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (url && token) {
    return takeTokenRedis(key, url, token);
  }
  return takeTokenInMemory(key);
}

export function clientIdentifierFromRequest(req: Request, userId?: string): string {
  const forwarded = req.headers.get("x-forwarded-for");
  const ip = forwarded ? forwarded.split(",")[0].trim() : "unknown-ip";
  return userId ? `user:${userId}` : `ip:${ip}`;
}
