import HeroDemo from "./HeroDemo";
import Reveal from "./Reveal";

export default function Hero() {
  return (
    <section id="top" className="relative overflow-hidden px-6 pb-20 pt-16 md:pt-24">
      <div className="pointer-events-none absolute inset-0 grain opacity-40" />
      <div
        className="pointer-events-none absolute left-1/2 top-0 h-[500px] w-[900px] -translate-x-1/2 rounded-full bg-accent/20 blur-[120px]"
        aria-hidden
      />

      <div className="relative mx-auto grid max-w-6xl gap-14 md:grid-cols-2 md:items-center">
        <Reveal>
          <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-1.5 text-xs font-medium text-white/70">
            <span className="h-1.5 w-1.5 rounded-full bg-accent" />
            Pinterest-trained AI poster generation
          </span>

          <h1 className="mt-6 font-heading text-4xl font-bold leading-[1.1] tracking-tight text-white md:text-5xl lg:text-6xl">
            From Pinterest Trends to Custom Posters in Seconds.
          </h1>

          <p className="mt-6 max-w-lg text-lg text-white/70">
            Type an idea. <span className="text-white">anshaj</span> automatically studies
            top-performing Pinterest designs and generates studio-grade posters tailored to
            your brand.
          </p>

          <div className="mt-9 flex flex-wrap items-center gap-4">
            <a
              href="#studio"
              className="rounded-full bg-accent px-7 py-3.5 text-sm font-semibold text-white shadow-xl shadow-accent/30 transition hover:bg-accent-soft hover:text-ink-950"
            >
              Try Free Now
            </a>
            <a href="#how-it-works" className="text-sm font-medium text-white/60 transition hover:text-white">
              See how it works →
            </a>
          </div>

          <p className="mt-6 text-xs uppercase tracking-widest text-white/30">
            No credit card · 3 free posters every month
          </p>
        </Reveal>

        <Reveal delay={0.15} className="relative">
          <HeroDemo />
        </Reveal>
      </div>
    </section>
  );
}
