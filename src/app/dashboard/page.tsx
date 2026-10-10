import type { Metadata } from "next";
import Link from "next/link";
import { FolderGit2, GitPullRequest, ShieldCheck, Sparkles, Timer } from "lucide-react";
import { ActivityChart } from "@/components/activity-chart";
import { EmptyState } from "@/components/empty-state";
import { ReviewList } from "@/components/review-list";
import { AnimatedNumber, Button, Github } from "@/components/ui";
import { installUrl } from "@/lib/env";
import { getStats, listReviews } from "@/lib/queries";
import { getSession } from "@/lib/session";

export const metadata: Metadata = { title: "Overview" };

const CATS = ["security", "bug", "performance", "maintainability", "style"];

export default async function Overview() {
  const session = (await getSession())!;
  const [stats, recent] = await Promise.all([getStats(session.uid), listReviews(session.uid, { limit: 6 })]);
  const install = installUrl();

  if (stats.installations === 0) {
    return (
      <EmptyState
        icon={<Github size={22} />}
        title="Install DevPulse on a repository"
        text="Pick the repositories you want reviewed. Your first review appears on the next pull request."
        action={install ? <Button href={install}>Install on GitHub</Button> : <Button href="/setup">Finish setup</Button>}
      />
    );
  }

  const t = stats.totals;
  const noiseRate = t.raw ? Math.round((t.filtered / t.raw) * 100) : 0;
  const catTotals = CATS.map((c) => ({ c, n: stats.categories.filter((x) => x.category === c).reduce((s, x) => s + x.n, 0) }));
  const catMax = Math.max(1, ...catTotals.map((c) => c.n));

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Welcome back, {session.login}</h1>
          <p className="mt-1 text-sm text-muted">What DevPulse has been doing across your repositories.</p>
        </div>
        <div className="flex gap-2">
          <Button href="/dashboard/repos" variant="secondary" size="sm"><FolderGit2 size={14} /> Repositories</Button>
          {install && <Button href={install} size="sm"><Github size={14} /> Add repos</Button>}
        </div>
      </div>

      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat icon={GitPullRequest} label="Reviews" value={t.reviews} />
        <Stat icon={ShieldCheck} label="Verified issues" value={t.issues} />
        <Stat icon={Sparkles} label="Noise filtered" value={noiseRate} suffix="%" hint={`${t.filtered} of ${t.raw} candidates`} />
        <Stat icon={Timer} label="Avg review time" value={(t.avg_ms ?? 0) / 1000} decimals={1} suffix="s" />
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-[1.6fr_1fr]">
        <div className="rounded-2xl border border-line bg-elev p-5">
          <ActivityChart data={stats.daily} />
        </div>
        <div className="rounded-2xl border border-line bg-elev p-5">
          <div className="text-sm text-muted">Issues by category</div>
          <ul className="mt-5 space-y-4">
            {catTotals.map(({ c, n }) => (
              <li key={c}>
                <div className="flex justify-between text-sm">
                  <span className="capitalize">{c}</span>
                  <span className="tabular-nums text-muted">{n}</span>
                </div>
                <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-sunken">
                  <div className="h-full origin-left rounded-full bg-accent-gradient" style={{ width: `${(n / catMax) * 100}%` }} />
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="mt-10 flex items-center justify-between">
        <h2 className="font-semibold">Recent reviews</h2>
        <Link href="/dashboard/reviews" className="text-sm text-muted hover:text-fg">View all →</Link>
      </div>
      <div className="mt-3">
        {recent.length ? (
          <ReviewList reviews={recent} />
        ) : (
          <div className="rounded-2xl border border-dashed border-line p-10 text-center text-sm text-muted">
            No reviews yet. Open a pull request on an installed repository — or comment <code className="font-mono text-fg">@devpulse review</code> on an existing one.
          </div>
        )}
      </div>
    </div>
  );
}

function Stat({ icon: Icon, label, value, suffix, decimals, hint }: { icon: typeof GitPullRequest; label: string; value: number; suffix?: string; decimals?: number; hint?: string }) {
  return (
    <div className="rounded-2xl border border-line bg-elev p-5">
      <div className="flex items-center justify-between text-sm text-muted">
        {label}
        <Icon size={16} className="text-subtle" />
      </div>
      <div className="mt-3 text-3xl font-semibold tracking-tight">
        <AnimatedNumber value={value} suffix={suffix} decimals={decimals} />
      </div>
      {hint && <div className="mt-1 text-xs text-subtle">{hint}</div>}
    </div>
  );
}
