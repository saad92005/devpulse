import Link from "next/link";
import { ArrowUpRight, CircleAlert, Loader2, MinusCircle } from "lucide-react";
import type { ReviewRow } from "@/lib/queries";
import { ScoreRing } from "./ui";

export function timeAgo(iso: string | Date) {
  const s = Math.max(1, Math.round((Date.now() - new Date(iso).getTime()) / 1000));
  const units: [number, string][] = [[31536000, "y"], [2592000, "mo"], [86400, "d"], [3600, "h"], [60, "m"]];
  for (const [n, u] of units) if (s >= n) return `${Math.floor(s / n)}${u} ago`;
  return "just now";
}

export function ReviewList({ reviews, showRepo = true }: { reviews: ReviewRow[]; showRepo?: boolean }) {
  return (
    <ul className="divide-y divide-line overflow-hidden rounded-2xl border border-line bg-elev">
      {reviews.map((r) => (
        <li key={r.id}>
          <Link href={`/dashboard/reviews/${r.id}`} className="group flex items-center gap-4 px-4 py-3.5 transition-colors hover:bg-sunken/60 sm:px-5">
            <Status r={r} />
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="truncate text-[14.5px] font-medium">{r.pr_title}</span>
                <span className="shrink-0 font-mono text-xs text-subtle">{r.pr_number > 0 ? `#${r.pr_number}` : "scan"}</span>
              </div>
              <div className="mt-0.5 flex flex-wrap gap-x-3 text-xs text-subtle">
                {showRepo && <span className="text-muted">{r.repo_full_name}</span>}
                {r.pr_author && <span>@{r.pr_author}</span>}
                <span>{timeAgo(r.created_at)}</span>
              </div>
            </div>
            {r.status === "completed" && (
              <div className="hidden text-right text-xs sm:block">
                <div className="font-medium tabular-nums">{r.findings_kept} issues</div>
                <div className="tabular-nums text-subtle">{(r.findings_raw ?? 0) - (r.findings_kept ?? 0)} filtered</div>
              </div>
            )}
            <ArrowUpRight size={16} className="shrink-0 text-subtle transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-fg" />
          </Link>
        </li>
      ))}
    </ul>
  );
}

function Status({ r }: { r: ReviewRow }) {
  if (r.status === "completed") return <ScoreRing score={r.score} size={40} stroke={4} />;
  const base = "grid size-10 shrink-0 place-items-center rounded-full border border-line";
  if (r.status === "failed") return <span className={`${base} text-critical`} title={r.error ?? ""}><CircleAlert size={18} /></span>;
  if (r.status === "skipped") return <span className={`${base} text-subtle`} title={r.error ?? ""}><MinusCircle size={18} /></span>;
  return <span className={`${base} text-accent`}><Loader2 size={18} className="animate-spin" /></span>;
}
