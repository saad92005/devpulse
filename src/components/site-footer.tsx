import Link from "next/link";
import { Logo } from "./ui";

export function SiteFooter() {
  return (
    <footer className="border-t border-line px-4 py-12">
      <div className="mx-auto flex max-w-6xl flex-col items-start justify-between gap-6 sm:flex-row sm:items-center">
        <div>
          <Logo />
          <p className="mt-2 text-sm text-subtle">AI pull-request reviews with a built-in noise filter.</p>
        </div>
        <nav className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-muted">
          <Link href="/playground" className="hover:text-fg">Playground</Link>
          <Link href="/setup" className="hover:text-fg">Self-host guide</Link>
          <Link href="/dashboard" className="hover:text-fg">Dashboard</Link>
        </nav>
      </div>
    </footer>
  );
}
