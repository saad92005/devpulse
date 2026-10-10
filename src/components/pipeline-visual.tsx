"use client";

import { motion } from "motion/react";
import { Brain, Filter, MessageSquareCode, ShieldCheck } from "lucide-react";

const STAGES = [
  { icon: MessageSquareCode, title: "Reviewer", text: "Reads the numbered diff and proposes candidate issues with a confidence score.", tone: "var(--accent)" },
  { icon: Filter, title: "Guard rails", text: "Rejects comments on lines you didn't touch, low confidence, off-focus or duplicate.", tone: "var(--medium)" },
  { icon: Brain, title: "Verifier", text: "A second, skeptical model re-reads each claim against the code and throws out speculation.", tone: "var(--accent-2)" },
  { icon: ShieldCheck, title: "Posted", text: "Only verified findings land on your PR, sorted by severity, with suggested fixes.", tone: "var(--ok)" },
];

export function PipelineVisual() {
  return (
    <div className="relative grid gap-4 md:grid-cols-4">
      {/* connecting line */}
      <svg aria-hidden className="absolute left-0 top-10 hidden h-2 w-full md:block" preserveAspectRatio="none" viewBox="0 0 100 2">
        <line x1="12" y1="1" x2="88" y2="1" stroke="var(--border-strong)" strokeWidth="0.4" strokeDasharray="1 1" />
        <motion.line
          x1="12" y1="1" x2="88" y2="1"
          stroke="url(#pipe)" strokeWidth="0.6"
          initial={{ pathLength: 0 }}
          whileInView={{ pathLength: 1 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 1.6, ease: "easeInOut", delay: 0.2 }}
        />
        <defs>
          <linearGradient id="pipe" x1="0" x2="1">
            <stop offset="0" stopColor="var(--accent)" />
            <stop offset="1" stopColor="var(--ok)" />
          </linearGradient>
        </defs>
      </svg>

      {STAGES.map((s, i) => (
        <motion.div
          key={s.title}
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.6, delay: 0.15 + i * 0.35, ease: [0.22, 1, 0.36, 1] }}
          className="relative flex flex-col items-center text-center"
        >
          <div className="relative grid size-20 place-items-center rounded-2xl border border-line bg-elev shadow-sm">
            <motion.span
              aria-hidden
              className="absolute inset-0 rounded-2xl"
              style={{ boxShadow: `0 0 0 1px ${s.tone}, 0 0 32px -6px ${s.tone}` }}
              initial={{ opacity: 0 }}
              whileInView={{ opacity: [0, 1, 0.35] }}
              viewport={{ once: true, margin: "-100px" }}
              transition={{ duration: 1.2, delay: 0.3 + i * 0.35 }}
            />
            <s.icon size={26} style={{ color: s.tone }} />
          </div>
          <div className="mt-2 font-mono text-[10.5px] uppercase tracking-widest text-subtle">Step {i + 1}</div>
          <h3 className="mt-1 font-semibold">{s.title}</h3>
          <p className="mt-1.5 max-w-[15rem] text-sm leading-6 text-muted">{s.text}</p>
        </motion.div>
      ))}
    </div>
  );
}
