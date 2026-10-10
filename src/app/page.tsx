import Link from "next/link";
import {
  ArrowRight, Bot, FileCode2, Gauge, GitPullRequest, Languages, LayoutDashboard, Lock, MessageSquareReply,
  Settings2, ShieldCheck, Sparkles, Zap,
} from "lucide-react";
import { Faq } from "@/components/faq";
import { HeroDemo } from "@/components/hero-demo";
import { HeroTitle } from "@/components/hero-title";
import { PipelineVisual } from "@/components/pipeline-visual";
import { SiteFooter } from "@/components/site-footer";
import { SiteNav } from "@/components/site-nav";
import { AnimatedNumber, Button, Github, Reveal, SpotlightCard } from "@/components/ui";
import { EXAMPLE_CONFIG } from "@/lib/config";
import { installUrl } from "@/lib/env";

const LANGS = ["TypeScript", "Python", "Go", "Rust", "Java", "Kotlin", "Swift", "C#", "PHP", "Ruby", "Dart", "C++", "SQL", "Terraform"];

export default function Home() {
  const install = installUrl() ?? "/setup";
  return (
    <>
      <SiteNav installHref={install} />
      <main className="relative overflow-x-clip">
        {/* ---------------------------------------------------------- Hero */}
        <section className="relative px-4 pb-24 pt-32 sm:pt-40">
          <div aria-hidden className="bg-grid mask-fade-b absolute inset-0 -z-10" />
          <div aria-hidden className="absolute left-1/2 top-0 -z-10 h-[520px] w-[900px] -translate-x-1/2 rounded-full bg-accent/20 blur-[140px]" />

          <div className="mx-auto grid max-w-6xl grid-cols-1 items-center gap-14 lg:grid-cols-[1.05fr_1fr] [&>*]:min-w-0">
            <div>
              <Reveal>
                <Link href="/playground" className="group inline-flex items-center gap-2 rounded-full border border-line bg-elev/70 py-1 pl-1 pr-3 text-[13px] text-muted backdrop-blur transition-colors hover:border-line-strong hover:text-fg">
                  <span className="rounded-full bg-accent-gradient px-2 py-0.5 text-[11px] font-semibold text-white">New</span>
                  Try it on any diff, no sign-up
                  <ArrowRight size={13} className="transition-transform group-hover:translate-x-0.5" />
                </Link>
              </Reveal>
              <div className="mt-6">
                <HeroTitle />
              </div>
              <Reveal delay={0.35}>
                <p className="mt-6 max-w-xl text-pretty text-lg leading-8 text-muted">
                  DevPulse is a GitHub App that reviews every pull request in seconds. A reviewer model finds bugs and
                  security holes, then a <span className="text-fg">verifier model throws out the noise</span> — so the
                  comments that reach your PR are the ones worth reading.
                </p>
              </Reveal>
              <Reveal delay={0.45}>
                <div className="mt-9 flex flex-wrap items-center gap-3">
                  <Button href={install} size="lg">
                    <Github size={18} /> Install on GitHub
                    <ArrowRight size={16} className="transition-transform group-hover:translate-x-0.5" />
                  </Button>
                  <Button href="/playground" size="lg" variant="secondary">
                    <Sparkles size={16} /> Open playground
                  </Button>
                </div>
                <p className="mt-4 text-[13px] text-subtle">Free & open source · Works on public and private repos · No code stored</p>
              </Reveal>
            </div>
            <Reveal delay={0.25} y={40}>
              <HeroDemo />
            </Reveal>
          </div>
        </section>

        {/* -------------------------------------------------------- Marquee */}
        <section className="border-y border-line bg-sunken/40 py-6">
          <div className="mask-fade-x flex overflow-hidden">
            <div className="flex shrink-0 animate-marquee gap-10 pr-10">
              {[...LANGS, ...LANGS].map((l, i) => (
                <span key={i} className="flex items-center gap-2 whitespace-nowrap font-mono text-sm text-subtle">
                  <FileCode2 size={14} /> {l}
                </span>
              ))}
            </div>
          </div>
        </section>

        {/* ------------------------------------------------------ Pipeline */}
        <section id="how" className="px-4 py-28">
          <div className="mx-auto max-w-6xl">
            <SectionHeading eyebrow="How it works" title="Two models. One opinion worth reading." sub="Most AI reviewers are noisy because nothing checks their work. DevPulse treats every comment as a claim that has to survive verification." />
            <div className="mt-16">
              <PipelineVisual />
            </div>
          </div>
        </section>

        {/* ------------------------------------------------------ Features */}
        <section id="features" className="px-4 pb-28">
          <div className="mx-auto max-w-6xl">
            <SectionHeading eyebrow="Features" title="Everything a senior reviewer does. Instantly." />
            <div className="mt-14 grid auto-rows-[minmax(220px,auto)] gap-4 md:grid-cols-6">
              <Feature className="md:col-span-4" icon={ShieldCheck} title="Catches what matters" text="SQL and command injection, leaked secrets, missing auth checks, null access, race conditions, N+1 queries, off-by-one errors — on the exact line, with a suggested fix.">
                <div className="mt-6 flex flex-wrap gap-2">
                  {[["critical", "Injection"], ["high", "Auth bypass"], ["high", "Race condition"], ["medium", "N+1 query"], ["low", "Unhandled promise"]].map(([s, t]) => (
                    <span key={t} className={`rounded-full border px-3 py-1 text-xs font-medium ${sevCls(s)}`}>{t}</span>
                  ))}
                </div>
              </Feature>
              <Feature className="md:col-span-2" icon={Zap} title="Seconds, not hours" text="Runs on Groq's fast inference. The review is usually on your PR before CI finishes." />
              <Feature className="md:col-span-2" icon={Gauge} title="PR health score" text="Every review gets a 0–100 score weighted by severity, tracked over time per repo." />
              <Feature className="md:col-span-2" icon={MessageSquareReply} title="ChatOps" text="Comment @devpulse review on any PR to re-run it on demand." />
              <Feature className="md:col-span-2" icon={Languages} title="Any language" text="Code in any language; comments in English, Urdu, Spanish or whatever your team speaks." />
              <Feature className="md:col-span-3" icon={LayoutDashboard} title="Transparent dashboard" text="See every finding — including the ones that were filtered and the exact reason why. No black box." />
              <Feature className="md:col-span-3" icon={Lock} title="Private by design" text="Least-privilege GitHub App. Diffs are never stored; only findings and metadata are kept." />
            </div>
          </div>
        </section>

        {/* -------------------------------------------------------- Config */}
        <section className="px-4 pb-28">
          <div className="mx-auto grid max-w-6xl grid-cols-1 items-center gap-12 lg:grid-cols-2 [&>*]:min-w-0">
            <div>
              <SectionHeading align="left" eyebrow="Configurable" title="Teach it your team's rules." sub="Drop a .devpulse.yml in your repo. Tune strictness, ignore generated code, cap the comment count, and write conventions in plain English — the reviewer follows them." />
              <ul className="mt-8 space-y-3 text-[15px] text-muted">
                {["Zero config needed — sensible defaults out of the box", "Invalid config never breaks reviews; we warn on the PR instead", "Per-repo pause switch in the dashboard"].map((t) => (
                  <li key={t} className="flex gap-3"><Settings2 size={18} className="mt-0.5 shrink-0 text-accent" />{t}</li>
                ))}
              </ul>
            </div>
            <Reveal>
              <div className="overflow-hidden rounded-2xl border border-line-strong bg-elev shadow-xl">
                <div className="flex items-center gap-2 border-b border-line px-4 py-3 font-mono text-xs text-muted">
                  <FileCode2 size={14} /> .devpulse.yml
                </div>
                <pre className="overflow-x-auto p-5 font-mono text-[12.5px] leading-6">
                  {EXAMPLE_CONFIG.split("\n").map((line, i) => (
                    <div key={i}>
                      {line.trim().startsWith("#") ? (
                        <span className="text-subtle">{line}</span>
                      ) : line.includes(":") && !line.trim().startsWith("-") ? (
                        <>
                          <span className="text-accent">{line.slice(0, line.indexOf(":"))}</span>
                          <span className="text-muted">{line.slice(line.indexOf(":"))}</span>
                        </>
                      ) : (
                        <span className="text-accent-2">{line || " "}</span>
                      )}
                    </div>
                  ))}
                </pre>
              </div>
            </Reveal>
          </div>
        </section>

        {/* --------------------------------------------------------- Facts */}
        <section className="border-y border-line bg-sunken/40 px-4 py-16">
          <div className="mx-auto grid max-w-5xl grid-cols-2 gap-8 text-center md:grid-cols-4">
            {[
              { v: 2, s: "", l: "model passes per review" },
              { v: 5, s: "", l: "deterministic guard rails" },
              { v: 0, s: "", l: "lines of your code stored" },
              { v: 0, s: "$", l: "to self-host on free tiers", prefix: true },
            ].map((f) => (
              <Reveal key={f.l}>
                <div className="text-4xl font-semibold tracking-tight sm:text-5xl">
                  {f.prefix ? "$" : ""}
                  <AnimatedNumber value={f.v} suffix={f.prefix ? "" : f.s} />
                </div>
                <div className="mt-2 text-sm text-muted">{f.l}</div>
              </Reveal>
            ))}
          </div>
        </section>

        {/* ----------------------------------------------------------- FAQ */}
        <section className="px-4 py-28">
          <div className="mx-auto max-w-3xl">
            <SectionHeading eyebrow="FAQ" title="Questions, answered." />
            <div className="mt-12">
              <Reveal><Faq /></Reveal>
            </div>
          </div>
        </section>

        {/* ----------------------------------------------------------- CTA */}
        <section className="px-4 pb-28">
          <Reveal>
            <div className="relative mx-auto max-w-5xl overflow-hidden rounded-[32px] border border-line-strong bg-elev px-6 py-20 text-center">
              <div aria-hidden className="absolute inset-0 bg-grid opacity-60" />
              <div aria-hidden className="absolute left-1/2 top-full h-[400px] w-[700px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-accent/30 blur-[120px]" />
              <div className="relative">
                <Bot size={36} className="mx-auto text-accent" />
                <h2 className="mx-auto mt-6 max-w-2xl text-balance text-4xl font-semibold tracking-tight sm:text-5xl">Your next PR deserves a second pair of eyes.</h2>
                <p className="mx-auto mt-4 max-w-lg text-muted">Install in under a minute. Open a pull request. Watch the review appear.</p>
                <div className="mt-9 flex flex-wrap justify-center gap-3">
                  <Button href={install} size="lg"><GitPullRequest size={18} /> Install DevPulse</Button>
                  <Button href="/playground" size="lg" variant="secondary">Try the playground</Button>
                </div>
              </div>
            </div>
          </Reveal>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}

function sevCls(s: string) {
  return { critical: "text-critical border-critical/30 bg-critical/10", high: "text-high border-high/30 bg-high/10", medium: "text-medium border-medium/30 bg-medium/10", low: "text-low border-low/30 bg-low/10" }[s];
}

function SectionHeading({ eyebrow, title, sub, align = "center" }: { eyebrow: string; title: string; sub?: string; align?: "center" | "left" }) {
  return (
    <Reveal className={align === "center" ? "mx-auto max-w-2xl text-center" : ""}>
      <div className="font-mono text-xs uppercase tracking-[0.2em] text-accent">{eyebrow}</div>
      <h2 className="mt-3 text-balance text-3xl font-semibold tracking-[-0.03em] sm:text-[2.75rem] sm:leading-[1.1]">{title}</h2>
      {sub && <p className="mt-4 text-pretty text-[17px] leading-8 text-muted">{sub}</p>}
    </Reveal>
  );
}

function Feature({ icon: Icon, title, text, className, children }: { icon: typeof Zap; title: string; text: string; className?: string; children?: React.ReactNode }) {
  return (
    <Reveal className={className}>
      <SpotlightCard className="h-full p-7">
        <div className="grid size-10 place-items-center rounded-xl border border-line bg-sunken text-accent">
          <Icon size={19} />
        </div>
        <h3 className="mt-5 text-lg font-semibold tracking-tight">{title}</h3>
        <p className="mt-2 max-w-lg text-[15px] leading-7 text-muted">{text}</p>
        {children}
      </SpotlightCard>
    </Reveal>
  );
}
