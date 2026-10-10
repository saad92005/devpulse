import type { Metadata } from "next";
import { CopyButton } from "@/components/copy-button";
import { Button } from "@/components/ui";
import { EXAMPLE_CONFIG } from "@/lib/config";
import { installUrl } from "@/lib/env";
import { getSession } from "@/lib/session";

export const metadata: Metadata = { title: "Settings" };

const OPTIONS: [string, string, string][] = [
  ["enabled", "true", "Turn reviews off for this repo without uninstalling."],
  ["strictness", "balanced", "relaxed / balanced / strict — sets the minimum confidence a finding needs (0.80 / 0.65 / 0.50)."],
  ["review_drafts", "false", "Review draft pull requests too."],
  ["max_comments", "15", "Upper bound on inline comments per review, most severe first."],
  ["focus", "bug, security, performance, maintainability", "Categories the reviewer may report. Add style for nitpicks."],
  ["ignore", "[]", "Extra glob patterns to skip. Lockfiles, builds and binaries are always skipped."],
  ["language", "English", "Language for review comments."],
  ["instructions", '""', "Your team conventions in plain English. The reviewer must follow them."],
];

export default async function SettingsPage() {
  const session = (await getSession())!;
  const install = installUrl();
  return (
    <div className="max-w-3xl">
      <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>

      <section className="mt-8 rounded-2xl border border-line bg-elev p-6">
        <h2 className="font-semibold">Account</h2>
        <div className="mt-4 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            {session.avatar && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={session.avatar} alt="" className="size-10 rounded-full border border-line" />
            )}
            <div>
              <div className="font-medium">{session.login}</div>
              <div className="text-xs text-subtle">Signed in with GitHub</div>
            </div>
          </div>
          <div className="flex gap-2">
            {install && <Button href={install} variant="secondary" size="sm">Manage installation</Button>}
            <form action="/api/auth/logout" method="post"><Button size="sm" variant="ghost">Sign out</Button></form>
          </div>
        </div>
      </section>

      <section className="mt-6 rounded-2xl border border-line bg-elev p-6">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold">Repository config</h2>
          <CopyButton text={EXAMPLE_CONFIG} />
        </div>
        <p className="mt-1 text-sm text-muted">Commit <code className="font-mono text-fg">.devpulse.yml</code> to your default branch. It&apos;s read from the PR&apos;s base branch, so contributors can&apos;t change the rules in their own PR.</p>
        <pre className="mt-4 overflow-x-auto rounded-xl border border-line bg-sunken p-4 font-mono text-[12.5px] leading-6">{EXAMPLE_CONFIG}</pre>
        <div className="mt-6 divide-y divide-line">
          {OPTIONS.map(([k, d, t]) => (
            <div key={k} className="grid gap-1 py-3 sm:grid-cols-[180px_1fr]">
              <div>
                <div className="font-mono text-sm text-accent">{k}</div>
                <div className="font-mono text-xs text-subtle">default: {d}</div>
              </div>
              <div className="text-sm text-muted">{t}</div>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-6 rounded-2xl border border-line bg-elev p-6">
        <h2 className="font-semibold">Commands</h2>
        <p className="mt-2 text-sm text-muted">Comment <code className="font-mono text-fg">@devpulse review</code> on any pull request to re-run the review on its latest commit.</p>
      </section>
    </div>
  );
}
