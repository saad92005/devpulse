import { z } from "zod";
import { ConfigSchema } from "@/lib/config";
import { sql, dbConfigured } from "@/lib/db";
import { parseUnifiedDiff, parsePatch } from "@/lib/diff";
import { LlmError, llmConfigured } from "@/lib/llm";
import { reviewDiff } from "@/lib/review";

export const maxDuration = 120;

const Body = z.object({
  diff: z.string().min(10).max(40_000),
  strictness: z.enum(["relaxed", "balanced", "strict"]).default("balanced"),
});

const LIMIT = 10; // reviews per IP per hour
const memory = new Map<string, { count: number; start: number }>();

async function rateLimited(ip: string): Promise<boolean> {
  const key = `playground:${ip}`;
  if (dbConfigured()) {
    const rows = await sql()`
      INSERT INTO rate_limits (key, count, window_start) VALUES (${key}, 1, now())
      ON CONFLICT (key) DO UPDATE SET
        count = CASE WHEN rate_limits.window_start < now() - interval '1 hour' THEN 1 ELSE rate_limits.count + 1 END,
        window_start = CASE WHEN rate_limits.window_start < now() - interval '1 hour' THEN now() ELSE rate_limits.window_start END
      RETURNING count`;
    return rows[0].count > LIMIT;
  }
  const now = Date.now();
  const entry = memory.get(key);
  if (!entry || now - entry.start > 3_600_000) {
    memory.set(key, { count: 1, start: now });
    return false;
  }
  entry.count++;
  return entry.count > LIMIT;
}

export async function POST(req: Request) {
  if (!llmConfigured()) {
    return Response.json({ error: "The AI provider is not configured on this server (GROQ_API_KEY)." }, { status: 503 });
  }
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "Paste a unified diff (10–40,000 characters)." }, { status: 400 });

  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
  if (await rateLimited(ip)) {
    return Response.json({ error: `Playground limit reached (${LIMIT}/hour). Install the GitHub App for unlimited reviews.` }, { status: 429 });
  }

  let files = parseUnifiedDiff(parsed.data.diff);
  if (files.length === 0 && /^@@/m.test(parsed.data.diff)) files = [parsePatch("snippet.ts", parsed.data.diff, "modified")];
  if (files.length === 0) {
    return Response.json({ error: "Couldn't find any diff hunks. Paste output of `git diff` (lines starting with @@, +, -)." }, { status: 400 });
  }

  try {
    const config = ConfigSchema.parse({ strictness: parsed.data.strictness, max_comments: 25 });
    const result = await reviewDiff(files, config);
    return Response.json({
      ...result,
      files: files.map((f) => ({
        path: f.path,
        additions: f.additions,
        deletions: f.deletions,
        lines: f.lines,
      })),
    });
  } catch (e) {
    const message = e instanceof LlmError ? e.message : "Review failed. Please try again.";
    console.error("[devpulse] playground failed", e);
    return Response.json({ error: message }, { status: 502 });
  }
}
