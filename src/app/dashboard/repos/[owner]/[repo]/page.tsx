import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ExternalLink } from "lucide-react";
import { RepoToggle } from "@/components/repo-toggle";
import { ReviewList } from "@/components/review-list";
import { ScoreRing } from "@/components/ui";
import { installationOctokit, listOpenPulls } from "@/lib/github";
import { listRepos, listReviews } from "@/lib/queries";
import { getSession } from "@/lib/session";
import { OpenPulls, ScanButton } from "./client";

export default async function RepoPage({ params }: PageProps<"/dashboard/repos/[owner]/[repo]">) {
  const { owner, repo } = await params;
  const fullName = `${owner}/${repo}`;
  const session = (await getSession())!;
  const repoRow = (await listRepos(session.uid)).find((r) => r.full_name === fullName);
  if (!repoRow) notFound();
  const [reviews, pulls] = await Promise.all([
    listReviews(session.uid, { repo: fullName, limit: 100 }),
    listOpenPulls(installationOctokit(Number(repoRow.installation_id)), owner, repo).catch(() => null),
  ]);

  return (
    <div>
      <Link href="/dashboard/repos" className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-fg"><ArrowLeft size={14} /> Repositories</Link>
      <div className="mt-4 flex flex-wrap items-center gap-5 rounded-2xl border border-line bg-elev p-6">
        <ScoreRing score={repoRow.avg_score} size={72} stroke={7} />
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-2xl font-semibold tracking-tight">{fullName}</h1>
          <p className="mt-1 text-sm text-muted">{repoRow.reviews} reviews · {repoRow.open_issues} verified issues</p>
          <div className="mt-2 flex items-center gap-2 text-xs text-muted">
            <RepoToggle fullName={fullName} enabled={repoRow.enabled} />
            Auto-review new PRs {repoRow.enabled ? "on" : "paused"}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <ScanButton repo={fullName} />
          <a href={`https://github.com/${fullName}`} target="_blank" rel="noreferrer" className="inline-flex h-10 items-center gap-1.5 rounded-full border border-line px-4 text-sm text-muted hover:text-fg">
            GitHub <ExternalLink size={13} />
          </a>
        </div>
      </div>
      <p className="mt-3 text-xs text-subtle">
        <b className="font-medium text-muted">Scan repository</b> runs the full reviewer → guard rails → verifier pipeline over the most important source files on the default branch. Results stay in your dashboard; nothing is posted to GitHub.
      </p>

      <h2 className="mt-10 font-semibold">Open pull requests</h2>
      <div className="mt-3">
        {pulls ? <OpenPulls repo={fullName} pulls={pulls} /> : <div className="rounded-2xl border border-dashed border-line p-8 text-center text-sm text-muted">Couldn&apos;t load pull requests from GitHub.</div>}
      </div>

      <h2 className="mt-10 font-semibold">Review history</h2>
      <div className="mt-3">
        {reviews.length ? <ReviewList reviews={reviews} showRepo={false} /> : <div className="rounded-2xl border border-dashed border-line p-10 text-center text-sm text-muted">No reviews yet. Scan the repository or review an open PR above.</div>}
      </div>
    </div>
  );
}
