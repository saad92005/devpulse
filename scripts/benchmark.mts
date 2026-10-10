// Measures the review pipeline against diffs with deliberately seeded bugs.
// Usage: npm run benchmark   (needs GROQ_API_KEY in .env.local)
//
// Recall    = seeded bugs that a VERIFIED finding caught (right file, ±2 lines, matching keyword)
// Noise cut = share of the reviewer's raw candidates that guards/verifier removed
// Clean FP  = verified findings on the "clean" sample, which has no seeded bugs

import { writeFileSync } from "node:fs";
import { ConfigSchema } from "../src/lib/config";
import { parseUnifiedDiff } from "../src/lib/diff";
import { llmConfig } from "../src/lib/llm";
import { reviewDiff, type Finding } from "../src/lib/review";
import { SAMPLES } from "../src/lib/samples";

process.loadEnvFile?.(".env.local");

const runs = Number(process.argv[2] ?? 1);
const config = ConfigSchema.parse({ max_comments: 25 });

const matches = (f: Finding, e: (typeof SAMPLES)[number]["expected"][number]) =>
  f.kept && f.path === e.path && Math.abs(f.line - e.line) <= 2 &&
  e.keywords.some((k) => `${f.title} ${f.body}`.toLowerCase().includes(k));

let seeded = 0, caught = 0, raw = 0, kept = 0, cleanFp = 0, ms = 0;
const rows: string[] = [];

for (let run = 0; run < runs; run++) {
  for (const sample of SAMPLES) {
    const result = await reviewDiff(parseUnifiedDiff(sample.diff), config);
    const hit = sample.expected.filter((e) => result.findings.some((f) => matches(f, e))).length;
    const k = result.findings.filter((f) => f.kept).length;
    seeded += sample.expected.length;
    caught += hit;
    raw += result.findings.length;
    kept += k;
    ms += result.durationMs;
    if (sample.expected.length === 0) cleanFp += k;
    rows.push(`| ${sample.name} | ${hit}/${sample.expected.length} | ${result.findings.length} | ${k} | ${result.score} | ${(result.durationMs / 1000).toFixed(1)}s |`);
    console.log(`${sample.name}: caught ${hit}/${sample.expected.length}, ${result.findings.length} raw → ${k} kept`);
  }
}

const pct = (a: number, b: number) => (b ? `${Math.round((a / b) * 100)}%` : "n/a");
const report = `# DevPulse benchmark

Model: \`${llmConfig().model}\` · runs: ${runs} · date: ${new Date().toISOString().slice(0, 10)}

| Metric | Value |
|---|---|
| Seeded bugs caught (recall) | **${caught}/${seeded} (${pct(caught, seeded)})** |
| Raw candidates filtered as noise | ${raw - kept}/${raw} (${pct(raw - kept, raw)}) |
| Verified findings on the clean sample (false positives) | ${cleanFp} |
| Average time per review | ${(ms / Math.max(1, runs * SAMPLES.length) / 1000).toFixed(1)}s |

| Sample | Caught | Raw | Kept | Score | Time |
|---|---|---|---|---|---|
${rows.join("\n")}
`;
writeFileSync("BENCHMARK.md", report);
console.log("\n" + report);
