"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";

type Point = { day: string; reviews: number; issues: number; score: number | null };

/** 30-day area chart of reviews with hover readout. Plain SVG, no chart lib. */
export function ActivityChart({ data }: { data: Point[] }) {
  const [hover, setHover] = useState<number | null>(null);
  const W = 640;
  const H = 180;
  const P = 8;
  const max = Math.max(1, ...data.map((d) => d.reviews));
  const x = (i: number) => P + (i * (W - 2 * P)) / Math.max(1, data.length - 1);
  const y = (v: number) => H - P - (v / max) * (H - 2 * P - 12);
  const line = data.map((d, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(d.reviews).toFixed(1)}`).join(" ");
  const area = `${line} L${x(data.length - 1)},${H - P} L${x(0)},${H - P} Z`;
  const h = hover !== null ? data[hover] : null;

  return (
    <div className="relative">
      <div className="mb-3 flex h-10 items-end justify-between">
        <AnimatePresence mode="wait">
          <motion.div key={h?.day ?? "total"} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }} transition={{ duration: 0.15 }}>
            {h ? (
              <div className="text-sm">
                <span className="font-medium">{new Date(h.day + "T00:00:00").toLocaleDateString(undefined, { month: "short", day: "numeric" })}</span>
                <span className="ml-3 text-muted">{h.reviews} reviews · {h.issues} issues{h.score !== null ? ` · avg ${h.score}` : ""}</span>
              </div>
            ) : (
              <div className="text-sm text-muted">Reviews per day · last 30 days</div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} className="h-44 w-full overflow-visible" preserveAspectRatio="none" onMouseLeave={() => setHover(null)}>
        <defs>
          <linearGradient id="area" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0" stopColor="var(--accent)" stopOpacity="0.35" />
            <stop offset="1" stopColor="var(--accent)" stopOpacity="0" />
          </linearGradient>
        </defs>
        {[0.25, 0.5, 0.75].map((t) => (
          <line key={t} x1={0} x2={W} y1={P + t * (H - 2 * P)} y2={P + t * (H - 2 * P)} stroke="var(--border)" strokeDasharray="3 5" vectorEffect="non-scaling-stroke" />
        ))}
        <motion.path d={area} fill="url(#area)" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.8, delay: 0.4 }} />
        <motion.path d={line} fill="none" stroke="var(--accent)" strokeWidth={2} vectorEffect="non-scaling-stroke" strokeLinejoin="round" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1] }} />
        {h && hover !== null && (
          <>
            <line x1={x(hover)} x2={x(hover)} y1={P} y2={H - P} stroke="var(--border-strong)" vectorEffect="non-scaling-stroke" />
            <circle cx={x(hover)} cy={y(h.reviews)} r={4} fill="var(--bg-elev)" stroke="var(--accent)" strokeWidth={2} vectorEffect="non-scaling-stroke" />
          </>
        )}
        {data.map((_, i) => (
          <rect key={i} x={x(i) - (W / data.length) / 2} y={0} width={W / data.length} height={H} fill="transparent" onMouseEnter={() => setHover(i)} />
        ))}
      </svg>
    </div>
  );
}
