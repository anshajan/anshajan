# anshaj

AI-powered Pinterest-to-Poster SaaS studio. Type a prompt → anshaj extracts
visual keywords, fetches top-performing Pinterest references, analyzes their
style with GPT-4o Vision, and generates a poster with DALL-E 3.

## Quick start

```bash
npm install
npm run dev
```

Open http://localhost:3000. **No API keys are required to try it** — with
`OPENAI_API_KEY` / `PINTEREST_ACCESS_TOKEN` unset, every step of the pipeline
runs in **demo mode** against realistic fixtures (`lib/demoData.ts`), so the
full UX — prompt → keyword extraction → Pinterest references → style
analysis → poster → download — works end to end out of the box.

## Going live

Copy `.env.example` to `.env.local` and fill in the keys you want to enable.
Each integration activates independently and the app degrades gracefully if
one is missing:

| Variable | Enables |
|---|---|
| `OPENAI_API_KEY` | Real keyword extraction, GPT-4o Vision style analysis, DALL-E 3 posters |
| `PINTEREST_ACCESS_TOKEN` | Real Pinterest API v5 reference search |
| `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` / `SUPABASE_SERVICE_ROLE_KEY` | Auth, persistent per-user credits, saved posters |
| `STRIPE_SECRET_KEY` / `STRIPE_WEBHOOK_SECRET` / price IDs | Subscription checkout and tier upgrades |
| `UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN` | Shared, multi-instance rate limiting (otherwise falls back to in-memory, single-instance limiting) |

Run `supabase/schema.sql` against your Supabase project (SQL editor or
`supabase db push`) to create `profiles`/`posters`, the row-level security
policies, and the `deduct_credit` / `refund_credit` RPCs the API depends on.

For Stripe: create two recurring Prices (Creator Pro, Agency/Studio), put
their IDs in `NEXT_PUBLIC_STRIPE_PRICE_CREATOR` / `NEXT_PUBLIC_STRIPE_PRICE_AGENCY`,
and point a webhook endpoint at `/api/webhook/stripe` listening for
`checkout.session.completed` and `customer.subscription.deleted`.

## Architecture

```
app/
  page.tsx                 Landing page (nav, hero, how-it-works, studio, pricing, security)
  api/generate/route.ts     Core pipeline: validate -> rate-limit -> deduct credit -> Pinterest -> GPT-4o Vision -> DALL-E 3
  api/checkout/route.ts     Stripe Checkout session creation
  api/webhook/stripe/route.ts  Stripe webhook (signature-verified) -> tier/credit updates
components/                 Landing page sections + the Live Poster Studio UI
lib/
  openai.ts, pinterest.ts   Provider integrations, each with a demo-mode fallback
  credits.ts                Atomic credit check-and-deduct (Supabase RPC) + anonymous demo quota
  security/                 Zod schemas, prompt sanitization, rate limiting, auth, headers/CORS
  demoData.ts               Sandbox fixtures used whenever API keys are absent
proxy.ts                     Applies CSP/X-Frame-Options/HSTS/etc. to every response (Next.js 16's `proxy` convention, formerly `middleware.ts`)
supabase/schema.sql          profiles/posters tables, RLS policies, deduct_credit/refund_credit RPCs
tests/pipeline.test.js       Vitest suite: validation, sanitization, headers, credits, demo fallback
```

### Pipeline flow (`/api/generate`)

1. CORS allowlist check, then rate limiting (per authenticated user, else per IP).
2. Zod validates the request; the prompt is sanitized and wrapped in explicit
   delimiters before it's ever sent to a model (prompt-injection defense).
3. A credit is **atomically checked-and-deducted** before any paid API call —
   this is a single conditional database update, so two concurrent requests
   can never both slip through on the last credit.
4. GPT-4o-mini extracts keywords → Pinterest API v5 fetches references →
   GPT-4o Vision analyzes their style → DALL-E 3 generates the poster.
5. If any step after the credit deduction fails, the credit is refunded —
   users are never charged for a generation they didn't receive.

Every external failure (empty Pinterest results, rate limits, timeouts) maps
to a specific HTTP status and a plain-language message instead of a raw
stack trace.

## Security

- **No secrets reach the browser.** `OPENAI_API_KEY` and
  `PINTEREST_ACCESS_TOKEN` are read only inside server-side modules
  (`lib/openai.ts`, `lib/pinterest.ts`), never in a `"use client"` file.
- **Rate limiting**: token-bucket per identity, Redis-backed when
  `UPSTASH_REDIS_REST_URL` is set, in-memory otherwise (`lib/security/rateLimit.ts`).
- **Input validation & prompt-injection defense**: strict Zod schemas reject
  unknown fields; `sanitizePromptText` strips HTML/script/template markers;
  user text is wrapped in explicit `<<<USER_PROMPT>>>` delimiters with
  instructions that it's data, not commands, before reaching any model.
- **Credit guardrails**: see the atomic deduction above; `/api/generate`
  returns `402` (not a silent failure) once a plan's quota is exhausted.
- **Security headers & CORS**: `proxy.ts` sets CSP, `X-Frame-Options: DENY`,
  `X-Content-Type-Options: nosniff`, HSTS and a Permissions-Policy on every
  response. A request's own origin (whatever domain it's actually deployed
  on — production, a Vercel preview URL, a custom domain) is always allowed
  automatically; `ALLOWED_ORIGINS` only needs to list *additional*, genuinely
  separate origins that should be able to call this API cross-site.
- **Stripe webhook** signature is verified against the raw request body
  before any event is trusted (`app/api/webhook/stripe/route.ts`).

### Dependency audit

This was built and verified against real installs (`npm install`, `npm run
build`, `npm test`) on Node.js 26. `npm audit` was run and acted on:

- **Next.js 16.4.6** — bumped up from an initially-pinned 14.x after `npm
  install` flagged multiple CVEs (DoS via Image Optimizer config, RSC request
  deserialization DoS, request smuggling in rewrites) that were only fixed in
  15.5+/16.x, not in any 14.x patch. This moved the `middleware.ts` convention
  to `proxy.ts` and removed `next lint` (now run via the ESLint CLI directly,
  `eslint.config.mjs`) — both already reflected in this codebase.
- **Zod v4** — bumped from v3 after a high-severity memory-exhaustion DoS in
  validating oversized collections, fixed only in zod >=4.6.6. All 12 tests
  in `tests/pipeline.test.js` pass unchanged against v4's API.
- **React 18 kept intentionally** — Next 16's own peer dependency still
  accepts `^18.2.0` (React 19 is only a soft recommendation, enforced
  starting Next 17). Bumping would also force `framer-motion` to a new
  major (it only supports React 18), so this was left as a deliberate,
  low-risk choice rather than cascading an unforced upgrade.
- **Remaining `npm audit` findings** (as of this writing) are confined to
  `vitest`/`vite`/`tinypool` — dev-only test tooling never shipped to
  production, exploitable only if you run `vitest --ui` with its API server
  exposed while browsing an untrusted site. The fix requires jumping vitest
  3 majors ahead (2.x → 5.x); left untouched here rather than risking an
  unverified test-runner rewrite. Re-run `npm audit` yourself before you
  deploy, since new advisories land after this was written.

## Testing

```bash
npm test
```

`tests/pipeline.test.js` covers request validation (good/bad payloads,
rejected unknown fields), prompt sanitization, the mandated security
headers and CORS allowlist, atomic credit deduction (including the
free-tier cutoff), and the Pinterest demo-mode fallback.

## Known limitations / what's left for a production launch

This is a complete, runnable scaffold with real integration logic, not a
fully operated production deployment — before launching for real:

- Payments: only Stripe is wired up end-to-end; Razorpay was named as an
  alternative in the brief but isn't implemented (add alongside `lib/stripe.ts`
  if you need India-first payment methods beyond cards).
- Auth: Supabase Auth UI (sign-up/login forms) isn't built — `lib/security/auth.ts`
  verifies whatever Supabase session JWT the frontend obtains, but you'll want
  to add actual login/signup screens using `@supabase/ssr`.
- The hero "product demo" is a hand-drawn Canvas animation (zero external
  assets required). Drop a real file at `public/demo.mp4` and it takes over
  automatically — see `components/HeroDemo.tsx`.
- In-memory rate limiting and the anonymous demo quota are per-process; set
  `UPSTASH_REDIS_REST_URL`/`UPSTASH_REDIS_REST_TOKEN` before scaling beyond a
  single instance.
- "Download HD" links directly to the generated image URL. Browsers only honor
  the `download` attribute for same-origin files, so on a real OpenAI/Pinterest
  URL this opens the image in a new tab rather than forcing a save dialog; proxy
  it through a same-origin API route (fetch the image server-side, stream it
  back with `Content-Disposition: attachment`) if you need a true one-click save.
- DALL-E 3 doesn't accept image inputs, so "style transfer" from references is
  implemented as a text-described super-prompt (palette/typography/layout/lighting
  in words), not literal pixel compositing — this matches how the brief's own
  pipeline is described (GPT-4o Vision extracts the style in words, DALL-E 3
  synthesizes from that description).
