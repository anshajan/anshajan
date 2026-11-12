"use client";

import { useState } from "react";

const TIERS = [
  {
    id: "free" as const,
    name: "Starter",
    price: "₹0",
    period: "forever",
    highlight: false,
    features: [
      "3 free poster generations / month",
      "Basic Pinterest keyword matching (top 2 refs)",
      "Standard-resolution PNG download",
      "Basic layout analysis",
    ],
  },
  {
    id: "creator" as const,
    name: "Creator Pro",
    price: "₹799",
    period: "/mo",
    highlight: true,
    features: [
      "60 HD poster generations / month",
      "Top 5 references + full hex & font breakdown",
      "Watermark-free 4K/HD downloads",
      "Custom brand color & text overlay",
      "Priority generation speed",
    ],
  },
  {
    id: "agency" as const,
    name: "Agency / Studio",
    price: "₹2,499",
    period: "/mo",
    highlight: false,
    features: [
      "250 HD poster generations / month",
      "Unlimited saved brand kits & board sync",
      "Bulk campaign variations (3 styles at once)",
      "Commercial license & priority API queue",
    ],
  },
];

export default function PricingSection() {
  const [loadingTier, setLoadingTier] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  async function upgrade(tier: "creator" | "agency") {
    setLoadingTier(tier);
    setNotice(null);
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tier }),
      });
      const data = await res.json();
      if (!res.ok) {
        setNotice(data.error ?? "Could not start checkout.");
        return;
      }
      window.location.assign(data.url);
    } catch {
      setNotice("Network error starting checkout.");
    } finally {
      setLoadingTier(null);
    }
  }

  return (
    <section id="pricing" className="px-6 py-24">
      <div className="mx-auto max-w-6xl">
        <h2 className="text-center font-heading text-3xl font-bold text-white md:text-4xl">
          Simple, creator-first pricing
        </h2>
        <p className="mx-auto mt-3 max-w-md text-center text-white/60">
          Start free. Upgrade when you need more HD generations and watermark-free exports.
        </p>

        {notice && (
          <p className="mx-auto mt-6 max-w-md rounded-lg bg-red-500/10 px-4 py-2 text-center text-sm text-red-300">
            {notice}
          </p>
        )}

        <div className="mt-12 grid gap-6 md:grid-cols-3">
          {TIERS.map((tier) => (
            <div
              key={tier.id}
              className={`relative flex flex-col rounded-2xl p-7 ${
                tier.highlight ? "glass border-2 border-accent" : "glass"
              }`}
            >
              {tier.highlight && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-accent px-3 py-1 text-xs font-semibold text-white">
                  Most Popular
                </span>
              )}
              <h3 className="font-heading text-xl font-bold text-white">{tier.name}</h3>
              <p className="mt-3 flex items-baseline gap-1">
                <span className="text-3xl font-bold text-white">{tier.price}</span>
                <span className="text-sm text-white/50">{tier.period}</span>
              </p>
              <ul className="mt-6 flex-1 space-y-3 text-sm text-white/65">
                {tier.features.map((f) => (
                  <li key={f} className="flex gap-2">
                    <span className="text-accent">✓</span>
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
              {tier.id === "free" ? (
                <a
                  href="#studio"
                  className="mt-7 rounded-full border border-white/15 px-5 py-3 text-center text-sm font-semibold text-white/85 transition hover:border-white/30"
                >
                  Start Free
                </a>
              ) : (
                <button
                  onClick={() => upgrade(tier.id)}
                  disabled={loadingTier === tier.id}
                  className="mt-7 rounded-full bg-accent px-5 py-3 text-center text-sm font-semibold text-white transition hover:bg-accent-soft hover:text-ink-950 disabled:opacity-50"
                >
                  {loadingTier === tier.id ? "Redirecting…" : `Upgrade to ${tier.name}`}
                </button>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
