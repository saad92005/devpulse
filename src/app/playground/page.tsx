import type { Metadata } from "next";
import { SiteNav } from "@/components/site-nav";
import { SiteFooter } from "@/components/site-footer";
import { installUrl } from "@/lib/env";
import { SAMPLES } from "@/lib/samples";
import { Playground } from "./playground";

export const metadata: Metadata = { title: "Playground", description: "Paste any git diff and get a verified AI code review in seconds." };

export default function PlaygroundPage() {
  return (
    <>
      <SiteNav installHref={installUrl() ?? "/setup"} />
      <main className="relative px-4 pb-24 pt-28 sm:pt-32">
        <div aria-hidden className="bg-grid mask-fade-b absolute inset-x-0 top-0 -z-10 h-[500px]" />
        <div className="mx-auto max-w-6xl">
          <div className="max-w-2xl">
            <div className="font-mono text-xs uppercase tracking-[0.2em] text-accent">Playground</div>
            <h1 className="mt-3 text-4xl font-semibold tracking-[-0.03em] sm:text-5xl">Review any diff, right now.</h1>
            <p className="mt-4 text-lg leading-8 text-muted">
              Paste the output of <code className="rounded bg-sunken px-1.5 py-0.5 font-mono text-[0.85em] text-fg">git diff</code> or pick a sample. You get the exact same pipeline the GitHub App runs — including everything it filtered out.
            </p>
          </div>
          <Playground samples={SAMPLES.map(({ id, name, diff }) => ({ id, name, diff }))} />
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
