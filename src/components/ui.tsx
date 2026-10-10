"use client";

import { forwardRef, useEffect, useRef, type ComponentProps, type ReactNode } from "react";
import Link from "next/link";
import { animate, motion, useInView, useMotionTemplate, useMotionValue, useReducedMotion } from "motion/react";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export const cn = (...c: Parameters<typeof clsx>) => twMerge(clsx(c));

/* ---------------------------------------------------------------- Button */

type Variant = "primary" | "secondary" | "ghost";
const VARIANTS: Record<Variant, string> = {
  primary:
    "bg-fg text-bg hover:opacity-90 shadow-[0_1px_0_0_rgba(255,255,255,0.15)_inset,0_8px_24px_-8px_var(--glow)]",
  secondary: "border border-line-strong bg-elev/60 text-fg backdrop-blur hover:border-fg/30",
  ghost: "text-muted hover:text-fg hover:bg-sunken",
};
const SIZES = { sm: "h-8 px-3 text-[13px]", md: "h-10 px-4 text-sm", lg: "h-12 px-6 text-[15px]" };

type ButtonProps = { variant?: Variant; size?: keyof typeof SIZES; href?: string; children: ReactNode } & ComponentProps<"button">;

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = "primary", size = "md", href, className, children, ...rest },
  ref,
) {
  const cls = cn(
    "group relative inline-flex select-none items-center justify-center gap-2 rounded-full font-medium transition-[opacity,colors,border-color,transform] duration-200 active:scale-[0.97] disabled:pointer-events-none disabled:opacity-50",
    VARIANTS[variant],
    SIZES[size],
    className,
  );
  if (href) {
    const external = href.startsWith("http");
    return (
      <Link href={href} className={cls} {...(external ? { target: "_blank", rel: "noreferrer" } : {})}>
        {children}
      </Link>
    );
  }
  return (
    <button ref={ref} className={cls} {...rest}>
      {children}
    </button>
  );
});

/* ---------------------------------------------------------- SpotlightCard */

export function SpotlightCard({ className, children, ...rest }: ComponentProps<"div">) {
  const x = useMotionValue(-400);
  const y = useMotionValue(-400);
  const bg = useMotionTemplate`radial-gradient(420px circle at ${x}px ${y}px, var(--glow), transparent 70%)`;
  return (
    <div
      onPointerMove={(e) => {
        const r = e.currentTarget.getBoundingClientRect();
        x.set(e.clientX - r.left);
        y.set(e.clientY - r.top);
      }}
      onPointerLeave={() => {
        x.set(-400);
        y.set(-400);
      }}
      className={cn("group relative overflow-hidden rounded-2xl border border-line bg-elev/70 backdrop-blur-sm", className)}
      {...rest}
    >
      <motion.div aria-hidden className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100" style={{ background: bg }} />
      <div className="relative h-full">{children}</div>
    </div>
  );
}

/* ----------------------------------------------------------------- Reveal */

export function Reveal({
  children,
  delay = 0,
  y = 24,
  className,
}: {
  children: ReactNode;
  delay?: number;
  y?: number;
  className?: string;
}) {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y, filter: "blur(6px)" }}
      whileInView={{ opacity: 1, y: 0, filter: "blur(0px)" }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.7, delay, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  );
}

/* --------------------------------------------------------- AnimatedNumber */

export function AnimatedNumber({ value, suffix = "", decimals = 0, className }: { value: number; suffix?: string; decimals?: number; className?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true });
  const reduce = useReducedMotion();
  useEffect(() => {
    if (!inView || !ref.current) return;
    const node = ref.current;
    if (reduce) {
      node.textContent = value.toFixed(decimals) + suffix;
      return;
    }
    const controls = animate(0, value, {
      duration: 1.4,
      ease: [0.16, 1, 0.3, 1],
      onUpdate: (v) => (node.textContent = v.toFixed(decimals) + suffix),
    });
    return () => controls.stop();
  }, [inView, value, suffix, decimals, reduce]);
  return (
    <span ref={ref} className={cn("tabular-nums", className)}>
      {(0).toFixed(decimals) + suffix}
    </span>
  );
}

/* -------------------------------------------------------------- ScoreRing */

export function scoreColor(score: number | null) {
  if (score === null) return "var(--fg-subtle)";
  if (score >= 85) return "var(--ok)";
  if (score >= 65) return "var(--medium)";
  if (score >= 40) return "var(--high)";
  return "var(--critical)";
}

export function ScoreRing({ score, size = 64, stroke = 6, label = true }: { score: number | null; size?: number; stroke?: number; label?: boolean }) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const pct = score === null ? 0 : score / 100;
  return (
    <div className="relative grid shrink-0 place-items-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--border)" strokeWidth={stroke} />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={scoreColor(score)}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          initial={{ strokeDashoffset: c }}
          whileInView={{ strokeDashoffset: c * (1 - pct) }}
          viewport={{ once: true }}
          transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
        />
      </svg>
      {label && (
        <span className="absolute font-semibold tabular-nums" style={{ fontSize: size * 0.3 }}>
          {score ?? "–"}
        </span>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ Badge */

export const SEVERITY_STYLES: Record<string, string> = {
  critical: "text-critical bg-critical/10 border-critical/25",
  high: "text-high bg-high/10 border-high/25",
  medium: "text-medium bg-medium/10 border-medium/25",
  low: "text-low bg-low/10 border-low/25",
};

export function Badge({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-full border border-line px-2 py-0.5 text-[11px] font-medium capitalize", className)}>
      {children}
    </span>
  );
}

export function SeverityBadge({ severity }: { severity: string }) {
  return <Badge className={SEVERITY_STYLES[severity]}>{severity}</Badge>;
}

/* ------------------------------------------------------------------- Logo */

export function Logo({ className, withText = true }: { className?: string; withText?: boolean }) {
  return (
    <span className={cn("inline-flex items-center gap-2 font-semibold tracking-tight", className)}>
      <span className="relative grid size-7 place-items-center rounded-lg bg-accent-gradient shadow-[0_4px_16px_-4px_var(--glow)]">
        <svg viewBox="0 0 24 24" className="size-4 text-white" fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 12h4l2.5-6 5 12 2.5-6h4" />
        </svg>
      </span>
      {withText && <span>DevPulse</span>}
    </span>
  );
}

/* ------------------------------------------------------------- GitHub mark */

export function Github({ size = 16, className }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden className={className}>
      <path d="M12 .5C5.65.5.5 5.65.5 12a11.5 11.5 0 0 0 7.86 10.92c.58.1.79-.25.79-.56v-2c-3.2.7-3.87-1.37-3.87-1.37-.53-1.33-1.28-1.69-1.28-1.69-1.05-.72.08-.7.08-.7 1.16.08 1.77 1.19 1.77 1.19 1.03 1.77 2.7 1.26 3.36.96.1-.75.4-1.26.73-1.55-2.55-.29-5.24-1.28-5.24-5.69 0-1.26.45-2.29 1.19-3.1-.12-.29-.52-1.46.11-3.05 0 0 .97-.31 3.17 1.18a11 11 0 0 1 5.77 0c2.2-1.49 3.17-1.18 3.17-1.18.63 1.59.23 2.76.11 3.05.74.81 1.19 1.84 1.19 3.1 0 4.42-2.7 5.4-5.26 5.68.41.36.78 1.06.78 2.14v3.17c0 .31.21.67.8.56A11.5 11.5 0 0 0 23.5 12C23.5 5.65 18.35.5 12 .5Z" />
    </svg>
  );
}
