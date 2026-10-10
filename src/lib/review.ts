import { CATEGORIES, CONFIDENCE_FLOOR, isIgnored, type Category, type RepoConfig } from "./config";
import { excerpt, renderForModel, type FilePatch } from "./diff";
import { chatJson, llmConfig } from "./llm";

// The pipeline:
//   1. Reviewer pass   — the model reads numbered diffs and proposes findings.
//   2. Guard rails     — drop findings on lines the PR didn't add, below the
//                        confidence floor, outside the repo's focus, or duplicated.
//   3. Checker pass    — a second, skeptical prompt re-reads each surviving
//                        finding against its code excerpt and rejects anything
//                        speculative or wrong. This is what keeps noise low.
//   4. Summary         — a short PR overview plus a 0–100 health score.

export const SEVERITIES = ["critical", "high", "medium", "low"] as const;
export type Severity = (typeof SEVERITIES)[number];

export type Finding = {
  path: string;
  line: number;
  severity: Severity;
  category: Category;
  title: string;
  body: string;
  suggestion?: string;
  confidence: number;
  kept: boolean;
  rejectedBy?: "guard" | "checker";
  rejectedReason?: string;
};

export type ReviewResult = {
  summary: string;
  score: number;
  filesReviewed: number;
  filesSkipped: string[];
  findings: Finding[]; // includes rejected ones, for transparency + metrics
  model: string;
  durationMs: number;
};

export type ReviewProgress = (stage: "reviewing" | "checking" | "summarizing", detail?: string) => void;

const MAX_BATCH_CHARS = 14_000;
const MAX_FILE_CHARS = 24_000;
const SEVERITY_WEIGHT: Record<Severity, number> = { critical: 25, high: 12, medium: 5, low: 1 };

export function scoreFor(findings: Pick<Finding, "severity" | "kept">[]): number {
  const penalty = findings.filter((f) => f.kept).reduce((s, f) => s + SEVERITY_WEIGHT[f.severity], 0);
  return Math.max(0, 100 - penalty);
}

const REVIEWER_SYSTEM = (config: RepoConfig) => `You are DevPulse, a senior staff engineer doing a pull-request code review.
You receive diffs where each line is prefixed with its NEW-file line number, then "+" (added), " " (context) or "-" (deleted, no number).

Report only real, specific problems introduced or exposed by the ADDED lines:
- bug: logic errors, null/undefined access, off-by-one, wrong async handling, race conditions, broken error handling
- security: injection (SQL/command/XSS), secrets in code, missing authz checks, unsafe deserialization, SSRF, weak crypto
- performance: N+1 queries, quadratic loops on large data, blocking I/O in hot paths, memory leaks
- maintainability: genuinely confusing or fragile code that will cause bugs
- style: only if explicitly in focus
Focus categories for this repo: ${config.focus.join(", ")}.

Rules:
- "line" MUST be a number shown with "+" in the diff.
- Never comment on deleted lines, formatting, missing comments, or naming taste.
- Do not invent code you cannot see. If unsure, lower "confidence" or omit.
- Prefer fewer, high-value findings. Zero findings is a valid answer.
- "suggestion" is a short corrected code snippet when helpful, else "".
- Write "title" and "body" in ${config.language}.
${config.instructions ? `\nRepository-specific instructions from the maintainers:\n${config.instructions}\n` : ""}
Respond with JSON only:
{"findings":[{"path":"src/x.ts","line":42,"severity":"critical|high|medium|low","category":"bug|security|performance|maintainability|style","title":"short headline","body":"why it is wrong and what happens","suggestion":"code","confidence":0.0-1.0}]}`;

const CHECKER_SYSTEM = `You are a skeptical verifier for an AI code reviewer. Most AI review comments are noise; your job is to reject them unless they are clearly correct.
For each candidate you get the claim and the surrounding diff excerpt (numbered new-file lines, "+" = added).
REJECT if: the claim is speculative ("might", "could potentially") without evidence in the code, it depends on code not shown, it misreads the code, it is about style/taste, or it points at the wrong line.
KEEP only if a competent engineer reading the excerpt would agree it is a real problem.
You may lower the severity if it is overstated (never raise it).
Respond with JSON only: {"verdicts":[{"id":0,"keep":true,"severity":"critical|high|medium|low","reason":"one sentence"}]}`;

function batchFiles(files: FilePatch[]): FilePatch[][] {
  const batches: FilePatch[][] = [];
  let current: FilePatch[] = [];
  let size = 0;
  for (const f of files) {
    const len = renderForModel(f).length;
    if (current.length && size + len > MAX_BATCH_CHARS) {
      batches.push(current);
      current = [];
      size = 0;
    }
    current.push(f);
    size += len;
  }
  if (current.length) batches.push(current);
  return batches;
}

async function mapLimit<T, R>(items: T[], limit: number, fn: (item: T, i: number) => Promise<R>): Promise<R[]> {
  const out: R[] = new Array(items.length);
  let next = 0;
  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, async () => {
      while (next < items.length) {
        const i = next++;
        out[i] = await fn(items[i], i);
      }
    }),
  );
  return out;
}

type RawFinding = Partial<Omit<Finding, "line" | "confidence">> & { line?: number | string; confidence?: number | string };

function normalize(raw: RawFinding): Omit<Finding, "kept"> | null {
  const line = Number(raw.line);
  if (!raw.path || !Number.isInteger(line) || !raw.title) return null;
  const severity = SEVERITIES.includes(raw.severity as Severity) ? (raw.severity as Severity) : "medium";
  const category = CATEGORIES.includes(raw.category as Category) ? (raw.category as Category) : "bug";
  const confidence = Math.min(1, Math.max(0, Number(raw.confidence ?? 0.5) || 0));
  return {
    path: String(raw.path).replace(/^[ab]\//, "").trim(),
    line,
    severity,
    category,
    title: String(raw.title).slice(0, 160),
    body: String(raw.body ?? "").slice(0, 2000),
    suggestion: raw.suggestion ? String(raw.suggestion).slice(0, 1500) : undefined,
    confidence,
  };
}

export async function reviewDiff(
  allFiles: FilePatch[],
  config: RepoConfig,
  context: { title?: string; description?: string } = {},
  onProgress?: ReviewProgress,
): Promise<ReviewResult> {
  const started = Date.now();
  const cfg = llmConfig();
  const filesSkipped: string[] = [];
  const files = allFiles.filter((f) => {
    const skip = isIgnored(f.path, config) || f.addedLines.size === 0 || renderForModel(f).length > MAX_FILE_CHARS;
    if (skip) filesSkipped.push(f.path);
    return !skip;
  });
  const byPath = new Map(files.map((f) => [f.path, f]));

  // 1. Reviewer pass
  onProgress?.("reviewing", `${files.length} files`);
  const prHeader = context.title
    ? `Pull request: ${context.title}\n${(context.description ?? "").slice(0, 1500)}\n\n`
    : "";
  const batches = batchFiles(files);
  const raw = (
    await mapLimit(batches, 2, async (batch) => {
      const res = await chatJson<{ findings?: RawFinding[] }>([
        { role: "system", content: REVIEWER_SYSTEM(config) },
        { role: "user", content: prHeader + batch.map(renderForModel).join("\n\n") },
      ]);
      return Array.isArray(res.findings) ? res.findings : [];
    })
  ).flat();

  // 2. Deterministic guard rails
  const floor = CONFIDENCE_FLOOR[config.strictness];
  const seen = new Set<string>();
  const findings: Finding[] = [];
  for (const r of raw) {
    const f = normalize(r);
    if (!f) continue;
    const file = byPath.get(f.path);
    let reason: string | undefined;
    if (!file) reason = "File is not part of this diff";
    else if (!file.addedLines.has(f.line)) reason = `Line ${f.line} was not added in this PR`;
    else if (!config.focus.includes(f.category)) reason = `Category "${f.category}" is outside this repo's focus`;
    else if (f.confidence < floor) reason = `Confidence ${f.confidence.toFixed(2)} is below the ${config.strictness} floor (${floor})`;
    else if (seen.has(`${f.path}:${f.line}`)) reason = "Duplicate of another finding on the same line";
    seen.add(`${f.path}:${f.line}`);
    findings.push(reason ? { ...f, kept: false, rejectedBy: "guard", rejectedReason: reason } : { ...f, kept: true });
  }

  // 3. Checker pass
  const candidates = findings.filter((f) => f.kept);
  if (candidates.length) {
    onProgress?.("checking", `${candidates.length} candidates`);
    const payload = candidates
      .map((f, id) => `#${id} ${f.path}:${f.line} [${f.severity}/${f.category}] ${f.title}\n${f.body}\n--- excerpt ---\n${excerpt(byPath.get(f.path)!, f.line)}`)
      .join("\n\n");
    try {
      const res = await chatJson<{ verdicts?: { id: number; keep: boolean; severity?: string; reason?: string }[] }>(
        [
          { role: "system", content: CHECKER_SYSTEM },
          { role: "user", content: payload },
        ],
        { model: cfg.checkerModel, temperature: 0 },
      );
      const verdicts = new Map((res.verdicts ?? []).map((v) => [Number(v.id), v]));
      candidates.forEach((f, id) => {
        const v = verdicts.get(id);
        if (!v) return; // checker silent → keep (guards already passed)
        if (!v.keep) {
          f.kept = false;
          f.rejectedBy = "checker";
          f.rejectedReason = v.reason ?? "Rejected by verifier";
        } else if (v.severity && SEVERITIES.indexOf(v.severity as Severity) > SEVERITIES.indexOf(f.severity)) {
          f.severity = v.severity as Severity; // downgrade only
        }
      });
    } catch {
      // If the checker fails we keep only high-confidence findings rather than everything.
      candidates.forEach((f) => {
        if (f.confidence < 0.85) {
          f.kept = false;
          f.rejectedBy = "checker";
          f.rejectedReason = "Verifier unavailable; held back low-confidence finding";
        }
      });
    }
  }

  // Cap the number of comments, most severe first.
  const kept = findings
    .filter((f) => f.kept)
    .sort((a, b) => SEVERITIES.indexOf(a.severity) - SEVERITIES.indexOf(b.severity) || b.confidence - a.confidence);
  kept.slice(config.max_comments).forEach((f) => {
    f.kept = false;
    f.rejectedBy = "guard";
    f.rejectedReason = `Over the max_comments limit (${config.max_comments})`;
  });

  // 4. Summary
  onProgress?.("summarizing");
  const finalKept = findings.filter((f) => f.kept);
  let summary = "";
  try {
    const res = await chatJson<{ summary?: string }>(
      [
        {
          role: "system",
          content: `Write a crisp pull-request review summary in ${config.language}: 2-4 sentences on what the change does and its overall risk. No headings, no bullet lists, no praise filler. JSON: {"summary":"..."}`,
        },
        {
          role: "user",
          content: `${prHeader}Files changed: ${files.map((f) => `${f.path} (+${f.additions}/-${f.deletions})`).join(", ")}\nVerified issues: ${
            finalKept.map((f) => `[${f.severity}] ${f.title}`).join("; ") || "none"
          }`,
        },
      ],
      { maxTokens: 2000 },
    );
    summary = (res.summary ?? "").trim();
  } catch {
    summary = "";
  }
  if (!summary) {
    summary = finalKept.length
      ? `Reviewed ${files.length} file(s) and found ${finalKept.length} verified issue(s).`
      : `Reviewed ${files.length} file(s). No verified issues found.`;
  }

  return {
    summary,
    score: scoreFor(findings),
    filesReviewed: files.length,
    filesSkipped,
    findings,
    model: cfg.model,
    durationMs: Date.now() - started,
  };
}
