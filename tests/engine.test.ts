import { afterEach, describe, expect, it, vi } from "vitest";
import { ConfigSchema, globToRegExp, isIgnored, parseConfig } from "../src/lib/config";
import { excerpt, parsePatch, parseUnifiedDiff } from "../src/lib/diff";
import { reviewDiff, scoreFor } from "../src/lib/review";
import { verifySignature } from "../src/lib/webhook";
import { createHmac } from "node:crypto";

const PATCH = `@@ -10,4 +10,6 @@ export function load(id) {
   const a = 1;
-  const b = 2;
+  const b = 3;
+  const q = "SELECT * FROM users WHERE id = " + id;
   return a;
+  // trailing
 }`;

describe("diff parser", () => {
  it("tracks new-file line numbers and added lines", () => {
    const f = parsePatch("src/a.ts", PATCH);
    expect([...f.addedLines]).toEqual([11, 12, 14]);
    expect(f.additions).toBe(3);
    expect(f.deletions).toBe(1);
    expect(f.lines.find((l) => l.text.includes("SELECT"))?.newLine).toBe(12);
  });

  it("parses multi-file git diffs and skips deleted files", () => {
    const diff = `diff --git a/x.ts b/x.ts
index 1..2 100644
--- a/x.ts
+++ b/x.ts
${PATCH}
diff --git a/gone.ts b/gone.ts
deleted file mode 100644
--- a/gone.ts
+++ /dev/null
@@ -1 +0,0 @@
-bye
diff --git a/new.ts b/new.ts
new file mode 100644
--- /dev/null
+++ b/new.ts
@@ -0,0 +1,2 @@
+one
+two
`;
    const files = parseUnifiedDiff(diff);
    expect(files.map((f) => [f.path, f.status])).toEqual([["x.ts", "modified"], ["new.ts", "added"]]);
    expect([...files[1].addedLines]).toEqual([1, 2]);
  });

  it("handles CRLF diffs", () => {
    const f = parsePatch("a", PATCH.replace(/\n/g, "\r\n"));
    expect([...f.addedLines]).toEqual([11, 12, 14]);
  });

  it("builds an excerpt around a line", () => {
    expect(excerpt(parsePatch("a", PATCH), 12)).toContain("  12 + ");
  });
});

describe("config", () => {
  it("uses defaults for empty or invalid yaml", () => {
    expect(parseConfig(null).config.strictness).toBe("balanced");
    expect(parseConfig("strictness: insane").error).toMatch(/strictness/);
    expect(parseConfig(": : :").config.max_comments).toBe(15);
  });

  it("matches globs", () => {
    expect(globToRegExp("**/*.ts").test("src/deep/a.ts")).toBe(true);
    expect(globToRegExp("**/*.ts").test("a.ts")).toBe(true);
    expect(globToRegExp("docs/**").test("docs/a/b.md")).toBe(true);
    expect(globToRegExp("*.md").test("docs/a.md")).toBe(false);
    expect(isIgnored("web/package-lock.json", ConfigSchema.parse({}))).toBe(true);
    expect(isIgnored("src/app.ts", ConfigSchema.parse({ ignore: ["src/**"] }))).toBe(true);
  });
});

describe("webhook signature", () => {
  it("accepts valid and rejects tampered payloads", () => {
    const body = '{"a":1}';
    const sig = `sha256=${createHmac("sha256", "s3cret").update(body).digest("hex")}`;
    expect(verifySignature("s3cret", body, sig)).toBe(true);
    expect(verifySignature("s3cret", body + " ", sig)).toBe(false);
    expect(verifySignature("s3cret", body, null)).toBe(false);
    expect(verifySignature("", body, sig)).toBe(false);
  });
});

describe("review pipeline (mocked LLM)", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("applies guard rails and the checker verdicts", async () => {
    process.env.GROQ_API_KEY = "test";
    const replies = [
      {
        findings: [
          { path: "src/a.ts", line: 12, severity: "critical", category: "security", title: "SQL injection", body: "id concatenated", confidence: 0.95 },
          { path: "src/a.ts", line: 10, severity: "low", category: "bug", title: "Context line", body: "x", confidence: 0.9 },
          { path: "src/a.ts", line: 11, severity: "medium", category: "bug", title: "Low conf", body: "x", confidence: 0.3 },
          { path: "src/a.ts", line: 14, severity: "high", category: "bug", title: "Hallucinated", body: "x", confidence: 0.9 },
          { path: "nope.ts", line: 1, severity: "high", category: "bug", title: "Wrong file", body: "x", confidence: 0.9 },
        ],
      },
      { verdicts: [{ id: 0, keep: true, severity: "high" }, { id: 1, keep: false, reason: "speculative" }] },
      { summary: "Adds a query." },
    ];
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({ choices: [{ message: { content: JSON.stringify(replies.shift()) } }] }))));

    const result = await reviewDiff([parsePatch("src/a.ts", PATCH)], ConfigSchema.parse({}));
    const byTitle = Object.fromEntries(result.findings.map((f) => [f.title, f]));

    expect(byTitle["SQL injection"].kept).toBe(true);
    expect(byTitle["SQL injection"].severity).toBe("high"); // downgraded by checker
    expect(byTitle["Context line"].rejectedBy).toBe("guard");
    expect(byTitle["Low conf"].rejectedBy).toBe("guard");
    expect(byTitle["Hallucinated"].rejectedBy).toBe("checker");
    expect(byTitle["Wrong file"].rejectedBy).toBe("guard");
    expect(result.score).toBe(88);
    expect(result.summary).toBe("Adds a query.");
  });

  it("scores reviews", () => {
    expect(scoreFor([])).toBe(100);
    expect(scoreFor([{ severity: "critical", kept: true }, { severity: "low", kept: false }])).toBe(75);
    expect(scoreFor(Array(10).fill({ severity: "critical", kept: true }))).toBe(0);
  });
});

import { SAMPLES } from "../src/lib/samples";

describe("benchmark samples", () => {
  it("seeded bug lines point at added lines", () => {
    for (const s of SAMPLES) {
      const files = parseUnifiedDiff(s.diff);
      expect(files.length).toBeGreaterThan(0);
      for (const e of s.expected) {
        const f = files.find((x) => x.path === e.path);
        expect(f, `${s.id} ${e.path}`).toBeDefined();
        expect(f!.addedLines.has(e.line), `${s.id} line ${e.line}`).toBe(true);
      }
    }
  });
});
