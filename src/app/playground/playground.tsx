"use client";

import { useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Brain, Clock, FileDiff, Filter, Loader2, Play, ShieldCheck, Sparkles, Wand2 } from "lucide-react";
import { toast } from "sonner";
import { DiffWithFindings, FindingCard, type UiFile, type UiFinding } from "@/components/findings";
import { Button, ScoreRing, cn } from "@/components/ui";

type Result = {
  summary: string;
  score: number;
  filesReviewed: number;
  filesSkipped: string[];
  findings: UiFinding[];
  files: UiFile[];
  model: string;
  durationMs: number;
};

const STRICTNESS = ["relaxed", "balanced", "strict"] as const;

export function Playground({ samples }: { samples: { id: string; name: string; diff: string }[] }) {
  const [diff, setDiff] = useState(samples[0].diff);
  const [sample, setSample] = useState(samples[0].id);
  const [strictness, setStrictness] = useState<(typeof STRICTNESS)[number]>("balanced");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<Result | null>(null);
  const resultsRef = useRef<HTMLDivElement>(null);

  async function run() {
    setLoading(true);
    setResult(null);
    try {
      const res = await fetch("/api/playground", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ diff, strictness }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Review failed");
      setResult(data);
      setTimeout(() => resultsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 80);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  const kept = result?.findings.filter((f) => f.kept) ?? [];
  const filtered = result?.findings.filter((f) => !f.kept) ?? [];

  return (
    <div className="mt-12">
      {/* controls */}
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 lg:mx-0 lg:px-0">
          {samples.map((s) => (
            <button
              key={s.id}
              onClick={() => { setSample(s.id); setDiff(s.diff); setResult(null); }}
              className={cn(
                "relative shrink-0 rounded-full border px-3.5 py-1.5 text-[13px] transition-colors",
                sample === s.id ? "border-transparent text-fg" : "border-line text-muted hover:text-fg",
              )}
            >
              {sample === s.id && <motion.span layoutId="sample-pill" className="absolute inset-0 rounded-full border border-line-strong bg-elev shadow-sm" transition={{ type: "spring", stiffness: 500, damping: 35 }} />}
              <span className="relative">{s.name}</span>
            </button>
          ))}
        </div>
        <div className="flex items-center gap-3">
          <div className="flex rounded-full border border-line bg-sunken p-1" role="radiogroup" aria-label="Strictness">
            {STRICTNESS.map((s) => (
              <button key={s} role="radio" aria-checked={strictness === s} onClick={() => setStrictness(s)} className={cn("relative rounded-full px-3 py-1 text-[12.5px] capitalize transition-colors", strictness === s ? "text-fg" : "text-muted hover:text-fg")}>
                {strictness === s && <motion.span layoutId="strict-pill" className="absolute inset-0 rounded-full bg-elev shadow-sm" transition={{ type: "spring", stiffness: 500, damping: 35 }} />}
                <span className="relative">{s}</span>
              </button>
            ))}
          </div>
          <Button onClick={run} disabled={loading || diff.trim().length < 10}>
            {loading ? <Loader2 size={16} className="animate-spin" /> : <Play size={15} />}
            {loading ? "Reviewing" : "Run review"}
          </Button>
        </div>
      </div>

      {/* editor */}
      <div className="relative mt-4 overflow-hidden rounded-2xl border border-line-strong bg-elev shadow-[0_20px_60px_-30px_rgba(0,0,0,0.4)]">
        <div className="flex items-center gap-2 border-b border-line bg-sunken/50 px-4 py-2.5 text-xs text-muted">
          <FileDiff size={14} /> diff
          <span className="ml-auto tabular-nums text-subtle">{diff.length.toLocaleString()} / 40,000</span>
        </div>
        <textarea
          value={diff}
          onChange={(e) => { setDiff(e.target.value); setSample(""); }}
          spellCheck={false}
          placeholder="Paste a unified diff (git diff) here…"
          className="block h-[340px] w-full resize-y bg-transparent p-4 font-mono text-[12.5px] leading-6 outline-none placeholder:text-subtle"
        />
        <AnimatePresence>{loading && <ReviewingOverlay />}</AnimatePresence>
      </div>

      {/* results */}
      <div ref={resultsRef} className="scroll-mt-28">
        <AnimatePresence mode="wait">
          {result && (
            <motion.div key="r" initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }} className="mt-10">
              <div className="grid gap-4 md:grid-cols-[auto_1fr]">
                <div className="flex items-center gap-5 rounded-2xl border border-line bg-elev p-6">
                  <ScoreRing score={result.score} size={92} stroke={8} />
                  <div>
                    <div className="text-xs uppercase tracking-widest text-subtle">Health</div>
                    <div className="mt-1 text-sm text-muted">
                      <div><span className="font-semibold text-fg">{kept.length}</span> verified issues</div>
                      <div><span className="font-semibold text-fg">{filtered.length}</span> filtered as noise</div>
                    </div>
                  </div>
                </div>
                <div className="rounded-2xl border border-line bg-elev p-6">
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-subtle">
                    <span className="inline-flex items-center gap-1"><Sparkles size={12} /> {result.model}</span>
                    <span className="inline-flex items-center gap-1"><Clock size={12} /> {(result.durationMs / 1000).toFixed(1)}s</span>
                    <span>{result.filesReviewed} file(s) reviewed</span>
                    {result.filesSkipped.length > 0 && <span>{result.filesSkipped.length} skipped</span>}
                  </div>
                  <p className="mt-3 text-[15px] leading-7">{result.summary}</p>
                </div>
              </div>

              <div className="mt-8 space-y-4">
                {result.files.filter((f) => !result.filesSkipped.includes(f.path)).map((f) => (
                  <DiffWithFindings key={f.path} file={f} findings={result.findings} />
                ))}
              </div>

              {kept.length === 0 && (
                <div className="mt-6 flex items-center gap-3 rounded-2xl border border-ok/30 bg-ok/5 p-5 text-sm">
                  <ShieldCheck className="text-ok" size={20} /> No verified issues. Nothing would be posted on this PR.
                </div>
              )}

              {filtered.length > 0 && (
                <details className="group mt-8 rounded-2xl border border-line bg-elev/60 p-5">
                  <summary className="flex cursor-pointer list-none items-center gap-2 font-medium">
                    <Filter size={16} className="text-accent" /> Filtered as noise ({filtered.length})
                    <span className="ml-2 text-sm font-normal text-muted">— never posted to the PR</span>
                  </summary>
                  <div className="mt-4 grid gap-3 md:grid-cols-2">
                    {filtered.map((f, i) => <FindingCard key={i} f={f} index={i} />)}
                  </div>
                </details>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

function ReviewingOverlay() {
  const steps = [
    { icon: Wand2, t: "Reviewer reading the diff" },
    { icon: Filter, t: "Guard rails filtering" },
    { icon: Brain, t: "Verifier double-checking" },
  ];
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 top-[41px] grid place-items-center bg-elev/75 backdrop-blur-[3px]">
      <div className="relative w-full max-w-xs">
        <motion.div aria-hidden className="absolute -inset-x-10 -top-20 h-px bg-gradient-to-r from-transparent via-accent to-transparent" animate={{ y: [0, 260, 0] }} transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }} />
        <ul className="space-y-3">
          {steps.map((s, i) => (
            <motion.li key={s.t} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.15 }} className="flex items-center gap-3 rounded-xl border border-line bg-elev px-4 py-3 text-sm shadow-sm">
              <s.icon size={16} className="text-accent" />
              {s.t}
              <span className="ml-auto flex gap-1">
                {[0, 1, 2].map((d) => (
                  <span key={d} className="size-1 animate-pulse-soft rounded-full bg-accent" style={{ animationDelay: `${i * 0.3 + d * 0.15}s` }} />
                ))}
              </span>
            </motion.li>
          ))}
        </ul>
        <p className="mt-4 text-center text-xs text-subtle">Usually 5–20 seconds</p>
      </div>
    </motion.div>
  );
}
