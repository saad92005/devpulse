import "server-only";
import { createAppAuth } from "@octokit/auth-app";
import { Octokit } from "@octokit/rest";
import { parsePatch, type FilePatch } from "./diff";
import { privateKey } from "./env";
import type { Finding, ReviewResult } from "./review";

export function installationOctokit(installationId: number) {
  return new Octokit({
    authStrategy: createAppAuth,
    auth: {
      appId: process.env.GITHUB_APP_ID!,
      privateKey: privateKey(),
      installationId,
    },
  });
}

export async function fetchPullFiles(gh: Octokit, owner: string, repo: string, pull: number): Promise<FilePatch[]> {
  const files = await gh.paginate(gh.pulls.listFiles, { owner, repo, pull_number: pull, per_page: 100 });
  return files
    .filter((f) => f.patch && f.status !== "removed")
    .map((f) => parsePatch(f.filename, f.patch!, f.status));
}

export async function fetchRepoConfig(gh: Octokit, owner: string, repo: string, ref: string): Promise<string | null> {
  for (const path of [".devpulse.yml", ".devpulse.yaml", ".github/devpulse.yml"]) {
    try {
      const res = await gh.repos.getContent({ owner, repo, path, ref });
      if (!Array.isArray(res.data) && res.data.type === "file" && "content" in res.data) {
        return Buffer.from(res.data.content, "base64").toString("utf8");
      }
    } catch {
      // 404 → try the next location
    }
  }
  return null;
}

const SEVERITY_ICON: Record<Finding["severity"], string> = {
  critical: "🔴",
  high: "🟠",
  medium: "🟡",
  low: "🔵",
};

function commentBody(f: Finding) {
  const lang = f.path.split(".").pop() ?? "";
  return [
    `${SEVERITY_ICON[f.severity]} **${f.title}**  \`${f.severity}\` · \`${f.category}\``,
    "",
    f.body,
    f.suggestion ? `\n<details><summary>Suggested fix</summary>\n\n\`\`\`${lang}\n${f.suggestion}\n\`\`\`\n</details>` : "",
  ].join("\n");
}

export function reviewBody(result: ReviewResult, dashboardUrl: string, configError?: string) {
  const kept = result.findings.filter((f) => f.kept);
  const rejected = result.findings.length - kept.length;
  const counts = (["critical", "high", "medium", "low"] as const)
    .map((s) => `${SEVERITY_ICON[s]} ${kept.filter((f) => f.severity === s).length}`)
    .join(" &nbsp; ");
  return [
    `## ⚡ DevPulse review — health **${result.score}/100**`,
    "",
    result.summary,
    "",
    `| Files reviewed | Verified issues | Filtered as noise | Time |`,
    `|---|---|---|---|`,
    `| ${result.filesReviewed} | ${kept.length} (${counts}) | ${rejected} | ${(result.durationMs / 1000).toFixed(1)}s |`,
    configError ? `\n> ⚠️ \`.devpulse.yml\` was invalid, defaults were used: ${configError}` : "",
    "",
    `<sub>[Full report](${dashboardUrl}) · Comment \`@devpulse review\` to re-run · Configure with \`.devpulse.yml\`</sub>`,
  ].join("\n");
}

/** Posts one review with inline comments; falls back to a summary-only review if GitHub rejects a line. */
export async function postReview(
  gh: Octokit,
  owner: string,
  repo: string,
  pull: number,
  commitId: string,
  result: ReviewResult,
  body: string,
): Promise<number> {
  const kept = result.findings.filter((f) => f.kept);
  const comments = kept.map((f) => ({ path: f.path, line: f.line, side: "RIGHT" as const, body: commentBody(f) }));
  try {
    const res = await gh.pulls.createReview({ owner, repo, pull_number: pull, commit_id: commitId, event: "COMMENT", body, comments });
    return res.data.id;
  } catch (e) {
    if ((e as { status?: number }).status !== 422 || comments.length === 0) throw e;
    const listed = kept.map((f) => `- ${SEVERITY_ICON[f.severity]} \`${f.path}:${f.line}\` **${f.title}** — ${f.body}`).join("\n");
    const res = await gh.pulls.createReview({
      owner, repo, pull_number: pull, commit_id: commitId, event: "COMMENT",
      body: `${body}\n\n### Findings\n${listed}`,
    });
    return res.data.id;
  }
}

/** OAuth (user-to-server) helpers for dashboard login. */
export async function exchangeCode(code: string): Promise<string> {
  const res = await fetch("https://github.com/login/oauth/access_token", {
    method: "POST",
    headers: { accept: "application/json", "content-type": "application/json" },
    body: JSON.stringify({
      client_id: process.env.GITHUB_CLIENT_ID,
      client_secret: process.env.GITHUB_CLIENT_SECRET,
      code,
    }),
  });
  const data = (await res.json()) as { access_token?: string; error_description?: string };
  if (!data.access_token) throw new Error(data.error_description ?? "GitHub login failed.");
  return data.access_token;
}
