export type PipelineStep = "keywords" | "pinterest" | "styles" | "poster";

const STEPS: { key: PipelineStep; label: string }[] = [
  { key: "keywords", label: "Extracting Keywords" },
  { key: "pinterest", label: "Fetching Pinterest References" },
  { key: "styles", label: "Analyzing Styles" },
  { key: "poster", label: "Generating Poster" },
];

export default function PipelineTracker({ activeIndex }: { activeIndex: number }) {
  return (
    <ol className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-2">
      {STEPS.map((step, i) => {
        const state = i < activeIndex ? "done" : i === activeIndex ? "active" : "pending";
        return (
          <li key={step.key} className="flex flex-1 items-center gap-2">
            <span
              className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold transition ${
                state === "done"
                  ? "bg-accent text-white"
                  : state === "active"
                  ? "animate-pulse-slow bg-accent/30 text-accent-soft ring-2 ring-accent"
                  : "bg-white/5 text-white/40"
              }`}
            >
              {state === "done" ? "✓" : i + 1}
            </span>
            <span
              className={`text-xs font-medium ${
                state === "pending" ? "text-white/40" : "text-white/85"
              }`}
            >
              {step.label}
            </span>
            {i < STEPS.length - 1 && (
              <span className="hidden h-px flex-1 bg-white/10 sm:block" aria-hidden />
            )}
          </li>
        );
      })}
    </ol>
  );
}
