import Reveal from "./Reveal";

const STEPS = [
  { n: "01", title: "Describe your poster", body: "One prompt — product, vibe, occasion. That's the whole brief." },
  { n: "02", title: "Smart keyword extraction", body: "GPT-4o-mini distills your prompt into the exact visual tags that matter." },
  { n: "03", title: "Pinterest reference fetch", body: "Pinterest API v5 returns the top-engaged pins matching those tags." },
  { n: "04", title: "GPT-4o Vision analysis", body: "Winning color palettes, typography, composition, and lighting get extracted." },
  { n: "05", title: "DALL-E 3 synthesis", body: "Your prompt + those insights become one optimized super-prompt — and your poster." },
];

export default function HowItWorks() {
  return (
    <section id="how-it-works" className="px-6 py-24">
      <div className="mx-auto max-w-5xl">
        <h2 className="text-center font-heading text-3xl font-bold text-white md:text-4xl">
          How anshaj works
        </h2>
        <div className="mt-14 grid gap-6 md:grid-cols-5">
          {STEPS.map((step, i) => (
            <Reveal key={step.n} delay={i * 0.08} className="glass rounded-xl p-5">
              <span className="font-heading text-2xl font-bold text-accent/70">{step.n}</span>
              <h3 className="mt-3 font-semibold text-white">{step.title}</h3>
              <p className="mt-2 text-sm text-white/55">{step.body}</p>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
