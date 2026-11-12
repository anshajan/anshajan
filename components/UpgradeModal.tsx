export default function UpgradeModal({ onClose }: { onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby="upgrade-title"
    >
      <div className="glass w-full max-w-sm rounded-2xl p-7 text-center">
        <h3 id="upgrade-title" className="font-heading text-xl font-bold text-white">
          You&apos;re out of free generations
        </h3>
        <p className="mt-2 text-sm text-white/65">
          You&apos;ve used all 3 free poster generations this month. Upgrade to Creator Pro for 60
          HD generations a month, watermark-free downloads, and priority speed.
        </p>
        <a
          href="#pricing"
          onClick={onClose}
          className="mt-6 block rounded-full bg-accent px-5 py-3 text-sm font-semibold text-white transition hover:bg-accent-soft hover:text-ink-950"
        >
          View Pricing
        </a>
        <button
          onClick={onClose}
          className="mt-3 block w-full text-sm text-white/50 transition hover:text-white"
        >
          Not now
        </button>
      </div>
    </div>
  );
}
