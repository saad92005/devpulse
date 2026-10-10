"use client";

import { useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion, useMotionValueEvent, useScroll } from "motion/react";
import { Menu, X } from "lucide-react";
import { Button, Logo, cn } from "./ui";
import { ThemeToggle } from "./theme-toggle";

const LINKS = [
  { href: "/#features", label: "Features" },
  { href: "/#how", label: "How it works" },
  { href: "/playground", label: "Playground" },
  { href: "/setup", label: "Self-host" },
];

export function SiteNav({ installHref }: { installHref: string }) {
  const { scrollY } = useScroll();
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const [hovered, setHovered] = useState<string | null>(null);
  useMotionValueEvent(scrollY, "change", (v) => setScrolled(v > 12));

  return (
    <header className="fixed inset-x-0 top-0 z-50 flex justify-center px-4 pt-3">
      <motion.nav
        initial={{ y: -40, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        className={cn(
          "flex h-14 w-full max-w-6xl items-center justify-between rounded-full px-3 pl-5 transition-[background-color,border-color,box-shadow,max-width] duration-500",
          scrolled
            ? "max-w-4xl border border-line bg-elev/70 shadow-[0_8px_32px_-12px_rgba(0,0,0,0.25)] backdrop-blur-xl"
            : "border border-transparent",
        )}
      >
        <Link href="/" aria-label="DevPulse home">
          <Logo />
        </Link>

        <ul className="hidden items-center md:flex" onMouseLeave={() => setHovered(null)}>
          {LINKS.map((l) => (
            <li key={l.href} className="relative">
              <Link
                href={l.href}
                onMouseEnter={() => setHovered(l.href)}
                className="relative z-10 block px-3.5 py-2 text-[13.5px] text-muted transition-colors hover:text-fg"
              >
                {l.label}
              </Link>
              {hovered === l.href && (
                <motion.span layoutId="nav-hover" className="absolute inset-0 rounded-full bg-sunken" transition={{ type: "spring", stiffness: 500, damping: 35 }} />
              )}
            </li>
          ))}
        </ul>

        <div className="flex items-center gap-2">
          <ThemeToggle />
          <Button href="/dashboard" variant="ghost" size="sm" className="hidden sm:inline-flex">
            Sign in
          </Button>
          <Button href={installHref} size="sm" className="hidden sm:inline-flex">
            Install free
          </Button>
          <button className="grid size-9 place-items-center rounded-full text-muted md:hidden" onClick={() => setOpen((o) => !o)} aria-label="Menu">
            {open ? <X size={18} /> : <Menu size={18} />}
          </button>
        </div>
      </motion.nav>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -12, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -12, scale: 0.98 }}
            transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
            className="absolute inset-x-4 top-20 rounded-3xl border border-line bg-elev/95 p-3 shadow-2xl backdrop-blur-xl md:hidden"
          >
            {LINKS.map((l, i) => (
              <motion.div key={l.href} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.04 * i }}>
                <Link href={l.href} onClick={() => setOpen(false)} className="block rounded-2xl px-4 py-3 text-[15px] hover:bg-sunken">
                  {l.label}
                </Link>
              </motion.div>
            ))}
            <div className="mt-2 grid grid-cols-2 gap-2 p-1">
              <Button href="/dashboard" variant="secondary">Sign in</Button>
              <Button href={installHref}>Install free</Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
