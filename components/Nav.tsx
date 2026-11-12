const LINKS = [
  { href: "#how-it-works", label: "How It Works" },
  { href: "#studio", label: "Live Studio" },
  { href: "#pricing", label: "Pricing" },
  { href: "#security", label: "Security" },
];

export default function Nav() {
  return (
    <header className="sticky top-0 z-50 border-b border-white/5 bg-ink-950/80 backdrop-blur-md">
      <nav className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <a href="#top" className="font-heading text-xl font-bold tracking-tight text-white">
          anshaj
        </a>

        <ul className="hidden items-center gap-8 text-sm text-white/70 md:flex">
          {LINKS.map((link) => (
            <li key={link.href}>
              <a href={link.href} className="transition hover:text-white">
                {link.label}
              </a>
            </li>
          ))}
        </ul>

        <div className="flex items-center gap-3">
          <button className="text-sm text-white/70 transition hover:text-white">Login</button>
          <a
            href="#studio"
            className="rounded-full bg-accent px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-accent/30 transition hover:bg-accent-soft hover:text-ink-950"
          >
            Start Free
          </a>
        </div>
      </nav>
    </header>
  );
}
