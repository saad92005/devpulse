import type { Metadata } from "next";
import Link from "next/link";
import { Lock } from "lucide-react";
import { RepoToggle } from "@/components/repo-toggle";
import { timeAgo } from "@/components/review-list";
import { Button, ScoreRing } from "@/components/ui";
import { installUrl } from "@/lib/env";
import { listRepos } from "@/lib/queries";
import { getSession } from "@/lib/session";

export const metadata: Metadata = { title: "Repositories" };

export default async function ReposPage() {
  const session = (await getSession())!;
  const repos = await listRepos(session.uid);
  const install = installUrl();
  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Repositories</h1>
          <p className="mt-1 text-sm text-muted">Health is the average score of completed reviews.</p>
        </div>
        {install && <Button href={install} size="sm" variant="secondary">Manage on GitHub</Button>}
      </div>

      {repos.length === 0 ? (
        <div className="mt-8 rounded-2xl border border-dashed border-line p-10 text-center text-sm text-muted">No repositories yet. Install the app on at least one repository.</div>
      ) : (
        <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {repos.map((r) => (
            <div key={r.id} className="group relative rounded-2xl border border-line bg-elev p-5 transition-[border-color,transform,box-shadow] duration-300 hover:-translate-y-0.5 hover:border-line-strong hover:shadow-[0_12px_40px_-20px_var(--glow)]">
              <div className="flex items-start justify-between gap-3">
                <Link href={`/dashboard/repos/${r.full_name}`} className="min-w-0 after:absolute after:inset-0">
                  <div className="flex items-center gap-1.5 text-xs text-subtle">
                    {r.account_login}
                    {r.private && <Lock size={11} />}
                  </div>
                  <div className="truncate font-semibold">{r.full_name.split("/")[1]}</div>
                </Link>
                <ScoreRing score={r.avg_score} size={52} stroke={5} />
              </div>
              <div className="mt-5 flex items-center justify-between">
                <div className="text-xs text-muted">
                  <span className="tabular-nums">{r.reviews}</span> reviews · <span className="tabular-nums">{r.open_issues}</span> issues
                  {r.last_review && <div className="mt-0.5 text-subtle">Last {timeAgo(r.last_review)}</div>}
                </div>
                <div className="relative z-10">
                  <RepoToggle fullName={r.full_name} enabled={r.enabled} />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
