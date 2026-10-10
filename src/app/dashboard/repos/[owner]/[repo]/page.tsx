import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ExternalLink } from "lucide-react";
import { RepoToggle } from "@/components/repo-toggle";
import { ReviewList } from "@/components/review-list";
import { ScoreRing } from "@/components/ui";
import { listRepos, listReviews } from "@/lib/queries";
import { getSession } from "@/lib/session";

export default async function RepoPage({ params }: PageProps<"/dashboard/repos/[owner]/[repo]">) {
  const { owner, repo } = await params;
  const fullName = `${owner}/${repo}`;
  const session = (await getSession())!;
  const repoRow = (await listRepos(session.uid)).find((r) => r.full_name === fullName);
  if (!repoRow) notFound();
  const reviews = await listReviews(session.uid, { repo: fullName, limit: 100 });

  return (
    <div>
      <Link href="/dashboard/repos" className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-fg"><ArrowLeft size={14} /> Repositories</Link>
      <div className="mt-4 flex flex-wrap items-center gap-5 rounded-2xl border border-line bg-elev p-6">
        <ScoreRing score={repoRow.avg_score} size={72} stroke={7} />
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-2xl font-semibold tracking-tight">{fullName}</h1>
          <p className="mt-1 text-sm text-muted">{repoRow.reviews} reviews · {repoRow.open_issues} verified issues</p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm text-muted">Reviews {repoRow.enabled ? "on" : "paused"}</span>
          <RepoToggle fullName={fullName} enabled={repoRow.enabled} />
          <a href={`https://github.com/${fullName}`} target="_blank" rel="noreferrer" className="grid size-9 place-items-center rounded-full border border-line text-muted hover:text-fg" aria-label="Open on GitHub"><ExternalLink size={15} /></a>
        </div>
      </div>
      <h2 className="mt-10 font-semibold">Reviews</h2>
      <div className="mt-3">
        {reviews.length ? <ReviewList reviews={reviews} showRepo={false} /> : <div className="rounded-2xl border border-dashed border-line p-10 text-center text-sm text-muted">No reviews on this repository yet.</div>}
      </div>
    </div>
  );
}
