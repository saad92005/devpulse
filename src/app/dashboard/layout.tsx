import { Suspense } from "react";
import Link from "next/link";
import { Settings2 } from "lucide-react";
import { DashNav } from "@/components/dash-nav";
import { EmptyState } from "@/components/empty-state";
import { PageTransition } from "@/components/page-transition";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button, Github, Logo } from "@/components/ui";
import { dbConfigured } from "@/lib/db";
import { githubAppConfigured } from "@/lib/env";
import { getSession } from "@/lib/session";

export default function DashboardLayout({ children }: LayoutProps<"/dashboard">) {
  return (
    <div className="flex min-h-dvh">
      <aside className="sticky top-0 hidden h-dvh w-64 shrink-0 flex-col border-r border-line bg-sunken/40 p-4 lg:flex">
        <Link href="/" className="px-2 py-1.5"><Logo /></Link>
        <div className="mt-8 flex-1"><Suspense fallback={null}><DashNav /></Suspense></div>
        <div className="flex items-center justify-between gap-2 border-t border-line pt-4">
          <Suspense fallback={<div className="skeleton h-9 w-32 rounded-full" />}>
            <UserChip />
          </Suspense>
          <ThemeToggle />
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-40 flex items-center justify-between gap-3 border-b border-line bg-bg/80 px-4 py-3 backdrop-blur-xl lg:hidden">
          <Link href="/"><Logo /></Link>
          <ThemeToggle />
        </header>
        <div className="border-b border-line px-2 lg:hidden"><Suspense fallback={<div className="h-11" />}><DashNav horizontal /></Suspense></div>
        <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-8 sm:py-10">
          <Suspense fallback={<PageSkeleton />}>
            <Gate>
              <PageTransition>{children}</PageTransition>
            </Gate>
          </Suspense>
        </main>
      </div>
    </div>
  );
}

async function UserChip() {
  const session = await getSession();
  if (!session) return <span className="px-2 text-sm text-muted">Not signed in</span>;
  return (
    <div className="flex min-w-0 items-center gap-2 px-1">
      {session.avatar && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={session.avatar} alt="" className="size-8 rounded-full border border-line" />
      )}
      <div className="min-w-0">
        <div className="truncate text-sm font-medium">{session.login}</div>
        <form action="/api/auth/logout" method="post">
          <button className="text-xs text-subtle hover:text-fg">Sign out</button>
        </form>
      </div>
    </div>
  );
}

async function Gate({ children }: { children: React.ReactNode }) {
  if (!dbConfigured() || !githubAppConfigured() || !process.env.SESSION_SECRET) {
    return (
      <EmptyState
        icon={<Settings2 size={22} />}
        title="This DevPulse server isn't configured yet"
        text="The dashboard needs a database and a GitHub App. The setup guide shows exactly which settings are missing."
        action={<Button href="/setup">Open setup guide</Button>}
      />
    );
  }
  const session = await getSession();
  if (!session) {
    return (
      <EmptyState
        icon={<Github size={22} />}
        title="Sign in to your dashboard"
        text="See every review DevPulse has posted on your repositories, what it caught, and what it filtered out."
        action={<Button href="/api/auth/login"><Github size={16} /> Continue with GitHub</Button>}
      />
    );
  }
  return <>{children}</>;
}

function PageSkeleton() {
  return (
    <div className="space-y-6">
      <div className="skeleton h-8 w-48 rounded-lg" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[0, 1, 2, 3].map((i) => <div key={i} className="skeleton h-28 rounded-2xl" />)}
      </div>
      <div className="skeleton h-72 rounded-2xl" />
    </div>
  );
}
