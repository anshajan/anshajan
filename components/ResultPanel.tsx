import type { GenerateResponse } from "@/lib/types";

export default function ResultPanel({
  result,
  onRegenerate,
  regenerating,
}: {
  result: GenerateResponse;
  onRegenerate: () => void;
  regenerating: boolean;
}) {
  return (
    <div className="grid gap-6 md:grid-cols-2">
      <div className="glass rounded-2xl p-5">
        <h3 className="text-xs font-semibold uppercase tracking-widest text-white/50">
          Pinterest References
        </h3>
        <div className="mt-4 grid grid-cols-2 gap-3">
          {result.references.map((pin) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              key={pin.id}
              src={pin.imageUrl}
              alt={pin.title}
              className="aspect-[4/5] w-full rounded-lg object-cover"
            />
          ))}
        </div>

        <h4 className="mt-5 text-xs font-semibold uppercase tracking-widest text-white/50">
          Extracted Palette
        </h4>
        <div className="mt-3 flex gap-2">
          {result.style.palette.map((hex) => (
            <div key={hex} className="flex flex-col items-center gap-1">
              <span
                className="h-8 w-8 rounded-full border border-white/10"
                style={{ backgroundColor: hex }}
              />
              <span className="text-[10px] text-white/50">{hex}</span>
            </div>
          ))}
        </div>

        <dl className="mt-5 space-y-2 text-sm text-white/65">
          <div>
            <dt className="inline font-medium text-white/80">Typography: </dt>
            <dd className="inline">{result.style.typography || "—"}</dd>
          </div>
          <div>
            <dt className="inline font-medium text-white/80">Layout: </dt>
            <dd className="inline">{result.style.layout || "—"}</dd>
          </div>
          <div>
            <dt className="inline font-medium text-white/80">Lighting: </dt>
            <dd className="inline">{result.style.lighting || "—"}</dd>
          </div>
        </dl>
        {result.style.notes && (
          <p className="mt-3 text-xs italic text-white/40">{result.style.notes}</p>
        )}
      </div>

      <div className="glass flex flex-col items-center rounded-2xl p-5">
        <h3 className="self-start text-xs font-semibold uppercase tracking-widest text-white/50">
          Your Poster
        </h3>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={result.posterUrl}
          alt="Generated poster"
          className="mt-4 max-h-[420px] rounded-xl object-contain shadow-2xl"
        />

        <div className="mt-6 flex w-full gap-3">
          <a
            href={result.posterUrl}
            download="anshaj-poster.png"
            target="_blank"
            rel="noreferrer"
            className="flex-1 rounded-full bg-accent px-4 py-3 text-center text-sm font-semibold text-white transition hover:bg-accent-soft hover:text-ink-950"
          >
            Download HD
          </a>
          <button
            onClick={onRegenerate}
            disabled={regenerating}
            className="flex-1 rounded-full border border-white/15 px-4 py-3 text-sm font-semibold text-white/80 transition hover:border-white/30 hover:text-white disabled:opacity-50"
          >
            {regenerating ? "Regenerating…" : "Regenerate"}
          </button>
        </div>

        <p className="mt-4 text-xs text-white/40">
          {result.credits.remaining} generation{result.credits.remaining === 1 ? "" : "s"} left
          on the {result.credits.tier} plan this month.
        </p>
      </div>
    </div>
  );
}
