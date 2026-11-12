"use client";

import { useRef, useState } from "react";
import PipelineTracker from "./PipelineTracker";
import ResultPanel from "./ResultPanel";
import UpgradeModal from "./UpgradeModal";
import type { GenerateResponse } from "@/lib/types";

const ASPECTS: { value: "1:1" | "4:5" | "9:16"; label: string }[] = [
  { value: "1:1", label: "1:1 Square" },
  { value: "4:5", label: "4:5 Instagram" },
  { value: "9:16", label: "9:16 Story/Poster" },
];

// Pacing for the client-side progress illusion while the single
// /api/generate request is in flight — the backend pipeline itself is not
// chunked/streamed, so this just keeps the tracker advancing in step with
// roughly how long each stage actually takes.
const STEP_DELAYS_MS = [600, 900, 900];

export default function Studio() {
  const [prompt, setPrompt] = useState("");
  const [aspectRatio, setAspectRatio] = useState<"1:1" | "4:5" | "9:16">("4:5");
  const [stepIndex, setStepIndex] = useState(0);
  const [status, setStatus] = useState<"idle" | "running" | "done" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [result, setResult] = useState<GenerateResponse | null>(null);
  const [showUpgrade, setShowUpgrade] = useState(false);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  function clearTimers() {
    timers.current.forEach(clearTimeout);
    timers.current = [];
  }

  async function runPipeline(promptOverride?: string) {
    const activePrompt = promptOverride ?? prompt;
    if (activePrompt.trim().length < 3) {
      setErrorMessage("Describe your poster in a few more words.");
      return;
    }

    clearTimers();
    setStatus("running");
    setErrorMessage(null);
    setStepIndex(0);

    let acc = 0;
    STEP_DELAYS_MS.forEach((delay, i) => {
      acc += delay;
      timers.current.push(setTimeout(() => setStepIndex(i + 1), acc));
    });

    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: activePrompt, aspectRatio }),
      });

      const data = await res.json();

      if (!res.ok) {
        clearTimers();
        if (res.status === 402) {
          setShowUpgrade(true);
          setStatus("idle");
          return;
        }
        setErrorMessage(data.error ?? "Something went wrong. Please try again.");
        setStatus("error");
        return;
      }

      clearTimers();
      setStepIndex(4);
      setResult(data as GenerateResponse);
      setStatus("done");
    } catch {
      clearTimers();
      setErrorMessage("Network error — check your connection and try again.");
      setStatus("error");
    }
  }

  const isRunning = status === "running";

  return (
    <section id="studio" className="px-6 py-24">
      <div className="mx-auto max-w-5xl">
        <div className="mb-10 text-center">
          <h2 className="font-heading text-3xl font-bold text-white md:text-4xl">
            Live Interactive Poster Studio
          </h2>
          <p className="mt-3 text-white/60">
            Describe your poster. Watch anshaj study Pinterest and generate it live.
          </p>
        </div>

        <div className="glass rounded-2xl p-6 md:p-8">
          <div className="flex flex-col gap-4 md:flex-row">
            <input
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && !isRunning && runPipeline()}
              maxLength={500}
              placeholder="e.g. Minimalist luxury gym poster, opening soon"
              className="flex-1 rounded-xl border border-white/10 bg-white/5 px-4 py-3.5 text-white placeholder-white/35 outline-none transition focus:border-accent"
            />
            <select
              value={aspectRatio}
              onChange={(e) => setAspectRatio(e.target.value as typeof aspectRatio)}
              className="rounded-xl border border-white/10 bg-white/5 px-4 py-3.5 text-white outline-none transition focus:border-accent"
            >
              {ASPECTS.map((a) => (
                <option key={a.value} value={a.value} className="bg-ink-800">
                  {a.label}
                </option>
              ))}
            </select>
            <button
              onClick={() => runPipeline()}
              disabled={isRunning}
              className="rounded-xl bg-accent px-7 py-3.5 text-sm font-semibold text-white transition hover:bg-accent-soft hover:text-ink-950 disabled:opacity-50"
            >
              {isRunning ? "Generating…" : "Generate Poster"}
            </button>
          </div>

          {errorMessage && (
            <p className="mt-4 rounded-lg bg-red-500/10 px-4 py-2 text-sm text-red-300">
              {errorMessage}
            </p>
          )}

          {(isRunning || status === "done") && (
            <div className="mt-8 border-t border-white/10 pt-6">
              <PipelineTracker activeIndex={stepIndex} />
            </div>
          )}
        </div>

        {status === "done" && result && (
          <div className="mt-8">
            <ResultPanel result={result} onRegenerate={() => runPipeline()} regenerating={isRunning} />
          </div>
        )}
      </div>

      {showUpgrade && <UpgradeModal onClose={() => setShowUpgrade(false)} />}
    </section>
  );
}
