"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { Check, GitPullRequest, ShieldAlert, Sparkles, X } from "lucide-react";

// A scripted, looping illustration of one review. It is clearly a demo
// (fixed sample code), not live data.

const CODE: { n?: number; t: string; k: "ctx" | "add" | "del" }[] = [
  { n: 14, t: "export async function searchUsers(req, res) {", k: "ctx" },
  { t: "  const users = await db.user.findMany({ where: { name: req.query.q } });", k: "del" },
  { n: 15, t: "  const q = req.query.q;", k: "add" },
  { n: 16, t: "  const users = await db.$queryRawUnsafe(", k: "add" },
  { n: 17, t: "    `SELECT * FROM users WHERE name LIKE '%${q}%'`", k: "add" },
  { n: 18, t: "  );", k: "add" },
  { n: 19, t: "  const list = users.map((u) => ({ id: u.id, name: u.name }));", k: "add" },
  { n: 20, t: "  res.json(list);", k: "ctx" },
  { n: 21, t: "}", k: "ctx" },
];

// step: 0 idle → 1 scanning → 2 two candidates → 3 verifier → 4 posted
const SCAN_ORDER = [2, 3, 4, 5, 6];

export function HeroDemo() {
  const reduce = useReducedMotion();
  const [step, setStep] = useState(reduce ? 4 : 0);
  const [scan, setScan] = useState(-1);

  useEffect(() => {
    if (reduce) return;
    const timers: ReturnType<typeof setTimeout>[] = [];
    const at = (ms: number, fn: () => void) => timers.push(setTimeout(fn, ms));
    const run = () => {
      at(0, () => { setStep(0); setScan(-1); });
      at(700, () => setStep(1));
      SCAN_ORDER.forEach((line, i) => at(900 + i * 280, () => setScan(line)));
      at(900 + SCAN_ORDER.length * 280, () => { setScan(-1); setStep(2); });
      at(3600, () => setStep(3));
      at(5000, () => setStep(4));
      at(10500, run);
    };
    run();
    return () => timers.forEach(clearTimeout);
  }, [reduce]);

  return (
    <div className="relative">
      <div aria-hidden className="absolute -inset-8 -z-10 rounded-[40px] bg-accent-gradient opacity-20 blur-3xl" />
      <div className="overflow-hidden rounded-2xl border border-line-strong bg-elev shadow-[0_30px_80px_-30px_rgba(0,0,0,0.5)]">
        {/* window chrome */}
        <div className="flex items-center gap-3 border-b border-line bg-sunken/60 px-4 py-3">
          <div className="flex gap-1.5">
            <span className="size-2.5 rounded-full bg-[#ff5f57]" />
            <span className="size-2.5 rounded-full bg-[#febc2e]" />
            <span className="size-2.5 rounded-full bg-[#28c840]" />
          </div>
          <div className="flex min-w-0 items-center gap-2 text-xs text-muted">
            <GitPullRequest size={13} className="shrink-0 text-ok" />
            <span className="truncate">
              acme/api · <span className="text-fg">#482 Add user search endpoint</span>
            </span>
          </div>
          <div className="ml-auto">
            <StatusPill step={step} />
          </div>
        </div>

        {/* diff */}
        <div className="font-mono text-[11.5px] leading-6 sm:text-[12.5px]">
          <div className="border-b border-line px-4 py-1.5 text-[11px] text-subtle">src/routes/users.ts</div>
          <div className="overflow-x-auto no-scrollbar">
            {CODE.map((l, i) => (
              <div key={i}>
                <div
                  className={
                    "relative flex whitespace-pre transition-colors duration-300 " +
                    (l.k === "add" ? "bg-ok/[0.07]" : l.k === "del" ? "bg-critical/[0.07]" : "")
                  }
                >
                  {scan === i && <motion.span layoutId="scan" className="absolute inset-0 bg-accent/15 ring-1 ring-accent/40" transition={{ type: "spring", stiffness: 600, damping: 40 }} />}
                  <span className="relative w-10 shrink-0 select-none pr-2 text-right text-subtle">{l.n ?? ""}</span>
                  <span className={"relative w-4 shrink-0 select-none " + (l.k === "add" ? "text-ok" : l.k === "del" ? "text-critical" : "text-subtle")}>
                    {l.k === "add" ? "+" : l.k === "del" ? "-" : " "}
                  </span>
                  <span className="relative pr-4">{l.t}</span>
                </div>

                <AnimatePresence>
                  {i === 4 && step >= 2 && (
                    <Comment
                      key="sql"
                      kept
                      verifying={step === 3}
                      posted={step >= 4}
                      icon={<ShieldAlert size={14} />}
                      title="SQL injection via unescaped query parameter"
                      body="`q` comes straight from the request and is interpolated into raw SQL. Use a parameterized query."
                      sev="critical"
                    />
                  )}
                  {i === 6 && step >= 2 && step < 4 && (
                    <Comment
                      key="noise"
                      verifying={step === 3}
                      rejected={step === 3}
                      icon={<Sparkles size={14} />}
                      title="Consider renaming `list` to something more descriptive"
                      body="Variable names could be clearer."
                      sev="low"
                    />
                  )}
                </AnimatePresence>
              </div>
            ))}
          </div>
        </div>
      </div>
      <p className="mt-3 text-center text-[11px] text-subtle">Illustration with sample code</p>
    </div>
  );
}

function StatusPill({ step }: { step: number }) {
  const map = [
    { t: "Waiting for PR", c: "text-subtle" },
    { t: "Reviewing diff…", c: "text-accent" },
    { t: "2 candidates found", c: "text-medium" },
    { t: "Verifying…", c: "text-accent-2" },
    { t: "1 issue · 1 filtered", c: "text-ok" },
  ];
  const s = map[step];
  return (
    <AnimatePresence mode="wait">
      <motion.span
        key={step}
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -6 }}
        transition={{ duration: 0.2 }}
        className={`flex items-center gap-1.5 whitespace-nowrap rounded-full border border-line bg-elev px-2.5 py-1 text-[11px] font-medium ${s.c}`}
      >
        <span className={`size-1.5 rounded-full bg-current ${step === 1 || step === 3 ? "animate-pulse-soft" : ""}`} />
        {s.t}
      </motion.span>
    </AnimatePresence>
  );
}

function Comment({
  title, body, sev, icon, kept, verifying, rejected, posted,
}: {
  title: string; body: string; sev: "critical" | "low"; icon: React.ReactNode;
  kept?: boolean; verifying?: boolean; rejected?: boolean; posted?: boolean;
}) {
  const color = sev === "critical" ? "text-critical border-critical/30" : "text-low border-low/30";
  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: "auto" }}
      exit={{ opacity: 0, height: 0, transition: { duration: 0.45, ease: [0.4, 0, 0.2, 1] } }}
      transition={{ type: "spring", stiffness: 260, damping: 28 }}
      className="overflow-hidden"
    >
      <div className="px-3 py-2 font-sans sm:pl-14">
        <motion.div
          animate={{ opacity: rejected ? 0.55 : 1, scale: rejected ? 0.985 : 1 }}
          className={`relative rounded-xl border bg-elev p-3 shadow-sm ${posted ? "border-line-strong" : "border-line"}`}
        >
          <div className="flex items-start gap-2">
            <span className={`mt-0.5 grid size-6 shrink-0 place-items-center rounded-md border ${color}`}>{icon}</span>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className={`text-[12.5px] font-semibold ${rejected ? "line-through decoration-critical/70" : ""}`}>{title}</span>
              </div>
              <p className="mt-0.5 text-[12px] leading-5 text-muted">{body}</p>
            </div>
          </div>
          <AnimatePresence>
            {verifying && (
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                className={`absolute -top-2.5 right-3 flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10.5px] font-medium bg-elev ${
                  kept ? "border-ok/40 text-ok" : "border-critical/40 text-critical"
                }`}
              >
                {kept ? <Check size={11} /> : <X size={11} />}
                {kept ? "Verified" : "Rejected: style opinion"}
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>
    </motion.div>
  );
}
