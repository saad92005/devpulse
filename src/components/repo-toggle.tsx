"use client";

import { useOptimistic, useTransition } from "react";
import { motion } from "motion/react";
import { toast } from "sonner";
import { toggleRepo } from "@/app/dashboard/actions";
import { cn } from "./ui";

export function RepoToggle({ fullName, enabled }: { fullName: string; enabled: boolean }) {
  const [optimistic, setOptimistic] = useOptimistic(enabled);
  const [, start] = useTransition();
  return (
    <button
      role="switch"
      aria-checked={optimistic}
      aria-label={`Reviews for ${fullName}`}
      onClick={() =>
        start(async () => {
          setOptimistic(!optimistic);
          try {
            await toggleRepo(fullName, !optimistic);
            toast.success(!optimistic ? `Reviews resumed for ${fullName}` : `Reviews paused for ${fullName}`);
          } catch {
            toast.error("Couldn't update the repository.");
          }
        })
      }
      className={cn("flex h-6 w-11 items-center rounded-full p-0.5 transition-colors", optimistic ? "bg-accent justify-end" : "bg-line-strong justify-start")}
    >
      <motion.span layout transition={{ type: "spring", stiffness: 700, damping: 35 }} className="size-5 rounded-full bg-white shadow" />
    </button>
  );
}
