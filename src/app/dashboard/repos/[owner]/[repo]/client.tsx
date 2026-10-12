"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { motion } from "motion/react";
import { GitPullRequest, Loader2, Radar, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { rerunReview, scanRepo } from "@/app/dashboard/actions";
import { timeAgo } from "@/components/review-list";

export function ScanButton({ repo }: { repo: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <motion.button
      whileHover={{ y: -1 }}
      whileTap={{ scale: 0.97 }}
      disabled={pending}
      onClick={() =>
        start(async () => {
          const res = await scanRepo(repo);
          if (!res.ok) return void toast.error(res.error ?? "Couldn't start the scan");
          toast.success("Scan started. This usually takes 20–60 seconds.");
          router.push(`/dashboard/reviews/${res.reviewId}`);
        })
      }
      className="group relative inline-flex h-10 items-center gap-2 overflow-hidden rounded-full bg-fg px-5 text-sm font-medium text-bg shadow-[0_8px_24px_-8px_var(--glow)] disabled:opacity-60"
    >
      <span className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/25 to-transparent transition-transform duration-700 group-hover:translate-x-full" />
      {pending ? <Loader2 size={15} className="animate-spin" /> : <Radar size={15} />}
      {pending ? "Starting scan…" : "Scan repository"}
    </motion.button>
  );
}

type Pull = { number: number; title: string; author: string | null; draft: boolean; updatedAt: string };

export function OpenPulls({ repo, pulls }: { repo: string; pulls: Pull[] }) {
  if (!pulls.length)
    return (
      <div className="rounded-2xl border border-dashed border-line p-8 text-center text-sm text-muted">
        No open pull requests. New ones are reviewed automatically when they&apos;re opened.
      </div>
    );
  return (
    <ul className="divide-y divide-line overflow-hidden rounded-2xl border border-line bg-elev">
      {pulls.map((p, i) => (
        <motion.li
          key={p.number}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.04 }}
          className="flex items-center gap-3 px-4 py-3"
        >
          <GitPullRequest size={16} className={p.draft ? "shrink-0 text-subtle" : "shrink-0 text-ok"} />
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-medium">
              {p.title} <span className="font-mono text-xs font-normal text-subtle">#{p.number}</span>
            </div>
            <div className="text-xs text-subtle">
              {p.author && `@${p.author} · `}updated {timeAgo(p.updatedAt)}
              {p.draft && " · draft"}
            </div>
          </div>
          <ReviewPullButton repo={repo} pr={p.number} />
        </motion.li>
      ))}
    </ul>
  );
}

function ReviewPullButton({ repo, pr }: { repo: string; pr: number }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <button
      disabled={pending}
      onClick={() =>
        start(async () => {
          const res = await rerunReview(repo, pr);
          if (!res.ok) return void toast.error(res.error ?? "Couldn't start a review");
          toast.success(`Reviewing #${pr}`);
          router.push(`/dashboard/reviews/${res.reviewId}`);
        })
      }
      className="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-full border border-line-strong px-3 text-[13px] transition-colors hover:border-accent hover:text-accent disabled:opacity-50"
    >
      {pending ? <Loader2 size={13} className="animate-spin" /> : <Sparkles size={13} />} Review
    </button>
  );
}
