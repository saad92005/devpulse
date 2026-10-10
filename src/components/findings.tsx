"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Bug, ChevronDown, Code2, Gauge, Lock, Paintbrush, ShieldOff, Wrench } from "lucide-react";
import { SeverityBadge, cn } from "./ui";

export type UiFinding = {
  path: string;
  line: number;
  severity: string;
  category: string;
  title: string;
  body: string;
  suggestion?: string | null;
  confidence: number;
  kept: boolean;
  rejectedBy?: string | null;
  rejectedReason?: string | null;
};

export type UiFile = {
  path: string;
  additions: number;
  deletions: number;
  lines: { kind: "add" | "del" | "ctx"; text: string; newLine?: number }[];
};

const CAT_ICON: Record<string, typeof Bug> = {
  bug: Bug,
  security: Lock,
  performance: Gauge,
  maintainability: Wrench,
  style: Paintbrush,
};

export function FindingCard({ f, index = 0, compact }: { f: UiFinding; index?: number; compact?: boolean }) {
  const [open, setOpen] = useState(false);
  const Icon = CAT_ICON[f.category] ?? Bug;
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05, type: "spring", stiffness: 300, damping: 30 }}
      className={cn("rounded-xl border bg-elev p-4", f.kept ? "border-line-strong" : "border-dashed border-line opacity-80")}
    >
      <div className="flex items-start gap-3">
        <span className={cn("mt-0.5 grid size-7 shrink-0 place-items-center rounded-lg border", f.kept ? "border-line text-fg" : "border-line text-subtle")}>
          {f.kept ? <Icon size={14} /> : <ShieldOff size={14} />}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            {f.kept && <SeverityBadge severity={f.severity} />}
            <span className="rounded-full bg-sunken px-2 py-0.5 text-[11px] capitalize text-muted">{f.category}</span>
            {!compact && (
              <span className="truncate font-mono text-[11.5px] text-subtle">
                {f.path}:{f.line}
              </span>
            )}
            <span className="ml-auto text-[11px] tabular-nums text-subtle">{Math.round(f.confidence * 100)}% conf.</span>
          </div>
          <h4 className={cn("mt-2 text-[14.5px] font-semibold leading-snug", !f.kept && "text-muted line-through decoration-subtle/60")}>{f.title}</h4>
          <p className="mt-1 text-sm leading-6 text-muted">{f.body}</p>
          {!f.kept && f.rejectedReason && (
            <p className="mt-2 inline-flex items-center gap-1.5 rounded-md bg-sunken px-2 py-1 text-xs text-muted">
              <span className="font-medium text-fg">{f.rejectedBy === "checker" ? "Verifier" : "Guard rail"}:</span> {f.rejectedReason}
            </p>
          )}
          {f.suggestion && f.kept && (
            <div className="mt-3">
              <button onClick={() => setOpen((o) => !o)} className="inline-flex items-center gap-1.5 text-xs font-medium text-accent hover:underline">
                <Code2 size={13} /> Suggested fix
                <motion.span animate={{ rotate: open ? 180 : 0 }}><ChevronDown size={13} /></motion.span>
              </button>
              <AnimatePresence initial={false}>
                {open && (
                  <motion.pre
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="mt-2 overflow-hidden overflow-x-auto rounded-lg border border-line bg-sunken p-3 font-mono text-[12px] leading-5"
                  >
                    {f.suggestion}
                  </motion.pre>
                )}
              </AnimatePresence>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}

/** A diff with verified findings rendered inline under their lines. */
export function DiffWithFindings({ file, findings }: { file: UiFile; findings: UiFinding[] }) {
  const byLine = new Map<number, UiFinding[]>();
  findings.filter((f) => f.kept && f.path === file.path).forEach((f) => byLine.set(f.line, [...(byLine.get(f.line) ?? []), f]));
  return (
    <div className="overflow-hidden rounded-xl border border-line bg-elev">
      <div className="flex items-center justify-between border-b border-line bg-sunken/50 px-4 py-2.5">
        <span className="truncate font-mono text-[12.5px]">{file.path}</span>
        <span className="shrink-0 font-mono text-[11.5px]">
          <span className="text-ok">+{file.additions}</span> <span className="text-critical">-{file.deletions}</span>
        </span>
      </div>
      <div className="overflow-x-auto font-mono text-[12px] leading-6">
        {file.lines.map((l, i) => (
          <div key={i}>
            <div className={cn("flex whitespace-pre", l.kind === "add" && "bg-ok/[0.07]", l.kind === "del" && "bg-critical/[0.07]", l.newLine && byLine.has(l.newLine) && "bg-medium/10")}>
              <span className="w-12 shrink-0 select-none pr-3 text-right text-subtle">{l.kind === "del" ? "" : l.newLine}</span>
              <span className={cn("w-4 shrink-0 select-none", l.kind === "add" ? "text-ok" : l.kind === "del" ? "text-critical" : "text-subtle")}>
                {l.kind === "add" ? "+" : l.kind === "del" ? "-" : " "}
              </span>
              <span className="pr-4">{l.text}</span>
            </div>
            {l.newLine !== undefined && l.kind !== "del" && byLine.get(l.newLine)?.map((f, j) => (
              <div key={j} className="border-y border-line bg-sunken/40 px-3 py-3 font-sans sm:pl-16">
                <FindingCard f={f} compact />
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
