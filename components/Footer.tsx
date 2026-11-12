export default function Footer() {
  return (
    <footer className="border-t border-white/5 px-6 py-10">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 text-sm text-white/40 md:flex-row">
        <span className="font-heading font-bold text-white/70">anshaj</span>
        <p>© {new Date().getFullYear()} anshaj. Built with Next.js, OpenAI & Pinterest API.</p>
      </div>
    </footer>
  );
}
