import type { Metadata } from "next";
import { Suspense } from "react";
import { connection } from "next/server";
import { CheckCircle2, Circle } from "lucide-react";
import { SiteFooter } from "@/components/site-footer";
import { SiteNav } from "@/components/site-nav";
import { Reveal } from "@/components/ui";
import { appUrl, installUrl } from "@/lib/env";

export const metadata: Metadata = { title: "Self-host guide" };

const STEPS: { title: string; body: React.ReactNode }[] = [
  {
    title: "Create a free Neon Postgres database",
    body: (
      <>Create a project at <A href="https://neon.tech">neon.tech</A>, copy the connection string into <C>DATABASE_URL</C>, then run <C>npm run db:migrate</C>.</>
    ),
  },
  {
    title: "Get a free Groq API key",
    body: <>Create a key at <A href="https://console.groq.com/keys">console.groq.com/keys</A> and set <C>GROQ_API_KEY</C>. Any OpenAI-compatible provider also works via <C>LLM_BASE_URL</C>, <C>LLM_API_KEY</C> and <C>LLM_MODEL</C>.</>,
  },
  {
    title: "Register the GitHub App",
    body: (
      <>
        Go to <A href="https://github.com/settings/apps/new">github.com/settings/apps/new</A> and fill in:
        <ul className="mt-3 space-y-1.5 text-[14px]">
          <li>• <b>Homepage URL:</b> <C>{"{APP_URL}"}</C></li>
          <li>• <b>Callback URL:</b> <C>{"{APP_URL}/api/auth/callback"}</C></li>
          <li>• <b>Webhook URL:</b> <C>{"{APP_URL}/api/webhooks/github"}</C> and a random <b>Webhook secret</b></li>
          <li>• <b>Repository permissions:</b> Pull requests — <i>Read & write</i>, Contents — <i>Read</i>, Issues — <i>Read & write</i> (for 👀 reactions), Metadata — <i>Read</i></li>
          <li>• <b>Subscribe to events:</b> Pull request, Issue comment</li>
        </ul>
        Then generate a <b>private key</b> and a <b>client secret</b>.
      </>
    ),
  },
  {
    title: "Set the environment variables",
    body: (
      <pre className="mt-1 overflow-x-auto rounded-xl border border-line bg-sunken p-4 font-mono text-[12.5px] leading-6">{`APP_URL=https://your-app.vercel.app
DATABASE_URL=postgres://...
GROQ_API_KEY=gsk_...
SESSION_SECRET=<32+ random characters>
GITHUB_APP_ID=123456
GITHUB_APP_SLUG=your-app-name
GITHUB_CLIENT_ID=Iv23...
GITHUB_CLIENT_SECRET=...
GITHUB_WEBHOOK_SECRET=...
GITHUB_APP_PRIVATE_KEY="-----BEGIN RSA PRIVATE KEY-----\\n...\\n-----END RSA PRIVATE KEY-----"`}</pre>
    ),
  },
  {
    title: "Install the app & open a PR",
    body: <>Install it on a repository, sign in to the dashboard, and open a pull request. The review appears within seconds.</>,
  },
];

export default function SetupPage() {
  return (
    <>
      <SiteNav installHref={installUrl() ?? "/setup"} />
      <main className="px-4 pb-24 pt-28 sm:pt-32">
        <div className="mx-auto max-w-3xl">
          <div className="font-mono text-xs uppercase tracking-[0.2em] text-accent">Self-host</div>
          <h1 className="mt-3 text-4xl font-semibold tracking-[-0.03em] sm:text-5xl">Run your own DevPulse — free.</h1>
          <p className="mt-4 text-lg leading-8 text-muted">Everything runs on free tiers: Vercel, Neon and Groq. About ten minutes end to end.</p>

          <Suspense fallback={<div className="skeleton mt-10 h-48 rounded-2xl" />}>
            <ConfigStatus />
          </Suspense>

          <ol className="mt-12 space-y-4">
            {STEPS.map((s, i) => (
              <Reveal key={s.title} delay={i * 0.05}>
                <li className="flex gap-5 rounded-2xl border border-line bg-elev p-6">
                  <span className="grid size-8 shrink-0 place-items-center rounded-full bg-accent-gradient text-sm font-semibold text-white">{i + 1}</span>
                  <div className="min-w-0 flex-1">
                    <h2 className="font-semibold">{s.title}</h2>
                    <div className="mt-2 text-[15px] leading-7 text-muted">{s.body}</div>
                  </div>
                </li>
              </Reveal>
            ))}
          </ol>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}

async function ConfigStatus() {
  await connection();
  const checks = [
    { label: "Database (DATABASE_URL)", ok: Boolean(process.env.DATABASE_URL) },
    { label: "AI provider (GROQ_API_KEY / LLM_API_KEY)", ok: Boolean(process.env.GROQ_API_KEY || process.env.LLM_API_KEY) },
    { label: "Session secret (SESSION_SECRET, 32+ chars)", ok: (process.env.SESSION_SECRET?.length ?? 0) >= 32 },
    { label: "GitHub App id + private key", ok: Boolean(process.env.GITHUB_APP_ID && process.env.GITHUB_APP_PRIVATE_KEY) },
    { label: "GitHub OAuth client id + secret", ok: Boolean(process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET) },
    { label: "Webhook secret", ok: Boolean(process.env.GITHUB_WEBHOOK_SECRET) },
    { label: "App slug (for the install button)", ok: Boolean(process.env.GITHUB_APP_SLUG) },
  ];
  const done = checks.filter((c) => c.ok).length;
  return (
    <div className="mt-10 rounded-2xl border border-line bg-elev p-6">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold">This server&apos;s configuration</h2>
        <span className="text-sm tabular-nums text-muted">{done}/{checks.length} ready</span>
      </div>
      <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-sunken">
        <div className="h-full rounded-full bg-accent-gradient transition-[width] duration-700" style={{ width: `${(done / checks.length) * 100}%` }} />
      </div>
      <ul className="mt-5 grid gap-2.5 sm:grid-cols-2">
        {checks.map((c) => (
          <li key={c.label} className="flex items-center gap-2.5 text-sm">
            {c.ok ? <CheckCircle2 size={16} className="shrink-0 text-ok" /> : <Circle size={16} className="shrink-0 text-subtle" />}
            <span className={c.ok ? "" : "text-muted"}>{c.label}</span>
          </li>
        ))}
      </ul>
      <p className="mt-5 text-xs text-subtle">APP_URL: <span className="font-mono">{appUrl()}</span></p>
    </div>
  );
}

function A({ href, children }: { href: string; children: React.ReactNode }) {
  return <a href={href} target="_blank" rel="noreferrer" className="text-accent underline-offset-4 hover:underline">{children}</a>;
}
function C({ children }: { children: React.ReactNode }) {
  return <code className="rounded bg-sunken px-1.5 py-0.5 font-mono text-[0.85em] text-fg">{children}</code>;
}
