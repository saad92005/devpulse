"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import { Loader2, RotateCw, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { rerunReview } from "@/app/dashboard/actions";
import { FindingCard, type UiFinding } from "@/components/findings";
import { cn } from "@/components/ui";

export function LiveRefresh() {
  const router = useRouter();
  useEffect(() => {
    const t = setInterval(() => router.refresh(), 3000);
    return () => clearInterval(t);
  }, [router]);
  return null;
}

export function RerunButton({ repo, pr, disabled }: { repo: string; pr: number; disabled?: boolean }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <button
      disabled={disabled || pending}
      onClick={() =>
        start(async () => {
          const res = await rerunReview(repo, pr);
          if (!res.ok) toast.error(res.error ?? "Couldn't start a review");
          else {
            toast.success("Review started");
            router.push(`/dashboard/reviews/${res.reviewId}`);
          }
        })
      }
      className="inline-flex h-8 items-center gap-1.5 rounded-full bg-fg px-3 text-[13px] font-medium text-bg transition-opacity hover:opacity-90 disabled:opacity-50"
    >
      {pending ? <Loader2 size={13} className="animate-spin" /> : <RotateCw size={13} />} Re-run
    </button>
  );
}

const TABS = ["verified", "filtered", "all"] as const;

export function FindingsPanel({ findings }: { findings: UiFinding[]; prUrl: string }) {
  const [tab, setTab] = useState<(typeof TABS)[number]>("verified");
  const counts = { verified: findings.filter((f) => f.kept).length, filtered: findings.filter((f) => !f.kept).length, all: findings.length };
  const shown = findings.filter((f) => (tab === "all" ? true : tab === "verified" ? f.kept : !f.kept));

  return (
    <div className="mt-8">
      <div className="flex gap-1 border-b border-line">
        {TABS.map((t) => (
          <button key={t} onClick={() => setTab(t)} className={cn("relative px-4 py-2.5 text-sm capitalize transition-colors", tab === t ? "text-fg" : "text-muted hover:text-fg")}>
            {t} <span className="ml-1 tabular-nums text-subtle">{counts[t]}</span>
            {tab === t && <motion.span layoutId="findings-tab" className="absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-accent" transition={{ type: "spring", stiffness: 500, damping: 38 }} />}
          </button>
        ))}
      </div>
      {tab === "filtered" && counts.filtered > 0 && (
        <p className="mt-4 text-sm text-muted">These were proposed by the reviewer but never posted. Each shows which stage rejected it and why.</p>
      )}
      <AnimatePresence mode="popLayout">
        <motion.div key={tab} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="mt-5 grid gap-3">
          {shown.length === 0 ? (
            <div className="flex items-center gap-3 rounded-2xl border border-dashed border-line p-8 text-sm text-muted">
              <ShieldCheck size={18} className="text-ok" />
              {tab === "verified" ? "No verified issues — nothing was flagged on this PR." : "Nothing here."}
            </div>
          ) : (
            shown.map((f, i) => <FindingCard key={`${f.path}:${f.line}:${i}`} f={f} index={i} />)
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
