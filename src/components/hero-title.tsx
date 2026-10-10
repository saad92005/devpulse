"use client";

import { motion } from "motion/react";

const LINE_1 = ["Code", "review", "that"];
const LINE_2 = ["doesn't", "spam", "you."];

export function HeroTitle() {
  const word = (w: string, i: number, gradient = false) => (
    <motion.span
      key={w + i}
      className={`inline-block ${gradient ? "text-gradient" : ""}`}
      initial={{ opacity: 0, y: "0.4em", filter: "blur(10px)" }}
      animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
      transition={{ duration: 0.8, delay: 0.1 + i * 0.07, ease: [0.22, 1, 0.36, 1] }}
    >
      {w}&nbsp;
    </motion.span>
  );
  return (
    <h1 className="text-balance text-[2.6rem] font-semibold leading-[1.02] tracking-[-0.04em] sm:text-6xl lg:text-[3.85rem]">
      {LINE_1.map((w, i) => word(w, i))}
      <br className="hidden sm:block" />
      {LINE_2.map((w, i) => word(w, i + LINE_1.length, true))}
    </h1>
  );
}
