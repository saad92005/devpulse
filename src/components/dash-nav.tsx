"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "motion/react";
import { FlaskConical, FolderGit2, GitPullRequest, LayoutDashboard, Settings } from "lucide-react";
import { cn } from "./ui";

const ITEMS = [
  { href: "/dashboard", label: "Overview", icon: LayoutDashboard, exact: true },
  { href: "/dashboard/reviews", label: "Reviews", icon: GitPullRequest },
  { href: "/dashboard/repos", label: "Repositories", icon: FolderGit2 },
  { href: "/dashboard/settings", label: "Settings", icon: Settings },
  { href: "/playground", label: "Playground", icon: FlaskConical },
];

export function DashNav({ horizontal }: { horizontal?: boolean }) {
  const pathname = usePathname();
  const active = (i: (typeof ITEMS)[number]) => (i.exact ? pathname === i.href : pathname.startsWith(i.href));
  return (
    <nav className={cn(horizontal ? "no-scrollbar flex overflow-x-auto" : "flex flex-col gap-0.5")}>
      {ITEMS.map((item) => {
        const on = active(item);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "relative flex shrink-0 items-center gap-3 rounded-lg px-3 py-2 text-[14px] transition-colors",
              on ? "text-fg" : "text-muted hover:text-fg",
              horizontal && "py-3",
            )}
          >
            {on && (
              <motion.span
                layoutId={horizontal ? "dash-nav-h" : "dash-nav"}
                className={cn("absolute", horizontal ? "inset-x-2 bottom-0 h-0.5 rounded-full bg-accent" : "inset-0 rounded-lg border border-line bg-elev shadow-sm")}
                transition={{ type: "spring", stiffness: 500, damping: 38 }}
              />
            )}
            <item.icon size={16} className={cn("relative", on && "text-accent")} />
            <span className="relative">{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
