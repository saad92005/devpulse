"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Plus } from "lucide-react";

const ITEMS = [
  {
    q: "How is this different from pasting my diff into ChatGPT?",
    a: "DevPulse runs automatically on every PR, comments on the exact line, and — most importantly — runs a second verifier pass plus deterministic guard rails that reject comments on code you didn't change, low-confidence guesses and style nitpicks. You see what was filtered and why on the dashboard.",
  },
  {
    q: "Does DevPulse store my source code?",
    a: "No. Diffs are fetched from GitHub, sent to the model, and discarded. Only the findings (file, line, title, explanation) and review metadata are stored so your dashboard works.",
  },
  {
    q: "Which models does it use?",
    a: "By default GPT-OSS 120B on Groq's free tier, which is fast enough to review most PRs in seconds. Any OpenAI-compatible endpoint works — set LLM_BASE_URL, LLM_API_KEY and LLM_MODEL. The verifier can use a different model than the reviewer.",
  },
  {
    q: "Can I control what it comments on?",
    a: "Yes. Commit a .devpulse.yml to choose strictness, focus categories, ignored paths, a comment cap, the review language and free-text team conventions the reviewer must follow.",
  },
  {
    q: "How do I re-run a review?",
    a: "Comment `@devpulse review` on the pull request, or hit Re-run on the review page in your dashboard. New pushes are reviewed automatically.",
  },
];

export function Faq() {
  const [open, setOpen] = useState<number | null>(0);
  return (
    <div className="divide-y divide-line rounded-2xl border border-line bg-elev/60">
      {ITEMS.map((item, i) => (
        <div key={item.q}>
          <button
            onClick={() => setOpen(open === i ? null : i)}
            className="flex w-full items-center justify-between gap-6 px-5 py-5 text-left font-medium sm:px-6"
            aria-expanded={open === i}
          >
            {item.q}
            <motion.span animate={{ rotate: open === i ? 45 : 0 }} transition={{ type: "spring", stiffness: 400, damping: 25 }} className="shrink-0 text-muted">
              <Plus size={18} />
            </motion.span>
          </button>
          <AnimatePresence initial={false}>
            {open === i && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
                className="overflow-hidden"
              >
                <p className="px-5 pb-5 text-[15px] leading-7 text-muted sm:px-6">{item.a}</p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      ))}
    </div>
  );
}
