const ITEMS = [
  {
    title: "Zero client-side secret exposure",
    body: "OPENAI_API_KEY and PINTEREST_ACCESS_TOKEN only ever exist in server-side API routes — never bundled into frontend JS.",
  },
  {
    title: "Rate limiting & bot protection",
    body: "Per-IP and per-user token-bucket limiting (Upstash Redis in production) stops API-wallet draining and abuse.",
  },
  {
    title: "Prompt injection defense",
    body: "Every prompt is Zod-validated, sanitized, and wrapped in explicit delimiters before it ever reaches the model.",
  },
  {
    title: "Atomic credit guardrails",
    body: "Credits are checked-and-deducted in a single database transaction before any paid API call, closing race-condition exploits.",
  },
  {
    title: "Strict security headers",
    body: "CSP, X-Frame-Options: DENY, X-Content-Type-Options: nosniff, HSTS, and an explicit CORS allowlist on every response.",
  },
];

export default function SecuritySection() {
  return (
    <section id="security" className="px-6 py-24">
      <div className="mx-auto max-w-5xl">
        <h2 className="text-center font-heading text-3xl font-bold text-white md:text-4xl">
          Built hardened, not bolted-on
        </h2>
        <div className="mt-12 grid gap-5 md:grid-cols-2">
          {ITEMS.map((item) => (
            <div key={item.title} className="glass rounded-xl p-5">
              <h3 className="font-semibold text-white">{item.title}</h3>
              <p className="mt-2 text-sm text-white/55">{item.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
