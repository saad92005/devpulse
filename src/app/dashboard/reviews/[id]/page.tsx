import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, CircleAlert, Clock, ExternalLink, FileCode2, GitCommit, Sparkles } from "lucide-react";
import { timeAgo } from "@/components/review-list";
import { ScoreRing } from "@/components/ui";
import { getReview } from "@/lib/queries";
import { getSession } from "@/lib/session";
import { FindingsPanel, LiveRefresh, RerunButton } from "./client";

export default async function ReviewPage({ params }: PageProps<"/dashboard/reviews/[id]">) {
  const id = Number((await params).id);
  if (!Number.isInteger(id)) notFound();
  const session = (await getSession())!;
  const data = await getReview(session.uid, id);
  if (!data) notFound();
  const { review: r, findings } = data;
  const running = r.status === "queued" || r.status === "running";

  return (
    <div>
      {running && <LiveRefresh />}
      <Link href="/dashboard/reviews" className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-fg"><ArrowLeft size={14} /> Reviews</Link>

      <div className="mt-4 rounded-2xl border border-line bg-elev p-6">
        <div className="flex flex-wrap items-start gap-5">
          {r.status === "completed" ? (
            <ScoreRing score={r.score} size={80} stroke={7} />
          ) : (
            <div className="grid size-20 place-items-center rounded-full border border-line text-accent">
              {running ? <span className="size-3 animate-pulse-soft rounded-full bg-accent" /> : <CircleAlert className={r.status === "failed" ? "text-critical" : "text-subtle"} />}
            </div>
          )}
          <div className="min-w-0 flex-1">
            <div className="text-sm text-muted">{r.repo_full_name}</div>
            <h1 className="mt-0.5 text-xl font-semibold tracking-tight sm:text-2xl">
              {r.pr_title} <span className="font-mono text-base font-normal text-subtle">#{r.pr_number}</span>
            </h1>
            <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-subtle">
              {r.pr_author && <span>@{r.pr_author}</span>}
              <span className="inline-flex items-center gap-1"><GitCommit size={12} />{r.head_sha.slice(0, 7)}</span>
              <span className="inline-flex items-center gap-1"><Clock size={12} />{timeAgo(r.created_at)}</span>
              {r.duration_ms && <span>{(r.duration_ms / 1000).toFixed(1)}s</span>}
              {r.files_reviewed !== null && <span className="inline-flex items-center gap-1"><FileCode2 size={12} />{r.files_reviewed} files</span>}
              {r.model && <span className="inline-flex items-center gap-1"><Sparkles size={12} />{r.model}</span>}
              <span className="capitalize">trigger: {r.trigger.split(":")[0]}</span>
            </div>
          </div>
          <div className="flex gap-2">
            <RerunButton repo={r.repo_full_name} pr={r.pr_number} disabled={running} />
            <a href={r.pr_url} target="_blank" rel="noreferrer" className="inline-flex h-8 items-center gap-1.5 rounded-full border border-line-strong px-3 text-[13px] hover:border-fg/30">
              PR <ExternalLink size={13} />
            </a>
          </div>
        </div>

        {running && <p className="mt-5 text-sm text-accent">Review in progress{r.stage ? ` — ${r.stage}` : ""}… this page updates automatically.</p>}
        {r.status === "failed" && <p className="mt-5 rounded-lg bg-critical/10 p-3 text-sm text-critical">Review failed: {r.error}</p>}
        {r.status === "skipped" && <p className="mt-5 rounded-lg bg-sunken p-3 text-sm text-muted">Skipped: {r.error}</p>}
        {r.summary && <p className="mt-5 max-w-3xl text-[15px] leading-7">{r.summary}</p>}
      </div>

      {r.status === "completed" && (
        <FindingsPanel
          findings={findings.map((f) => ({
            path: f.path, line: f.line, severity: f.severity, category: f.category, title: f.title, body: f.body,
            suggestion: f.suggestion, confidence: f.confidence, kept: f.kept, rejectedBy: f.rejected_by, rejectedReason: f.rejected_reason,
          }))}
          prUrl={r.pr_url}
        />
      )}
    </div>
  );
}
