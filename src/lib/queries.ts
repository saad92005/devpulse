import "server-only";
import { sql } from "./db";

// All dashboard reads are scoped to installations the signed-in user can access.

export type RepoRow = {
  id: string;
  installation_id: string;
  full_name: string;
  private: boolean;
  enabled: boolean;
  account_login: string;
  avatar_url: string | null;
  reviews: number;
  avg_score: number | null;
  last_review: string | null;
  open_issues: number;
};

export type ReviewRow = {
  id: number;
  repo_full_name: string;
  pr_number: number;
  pr_title: string;
  pr_author: string | null;
  pr_url: string;
  head_sha: string;
  trigger: string;
  status: string;
  stage: string | null;
  summary: string | null;
  score: number | null;
  files_reviewed: number | null;
  findings_raw: number | null;
  findings_kept: number | null;
  duration_ms: number | null;
  model: string | null;
  error: string | null;
  created_at: string;
  completed_at: string | null;
};

export type FindingRow = {
  id: number;
  path: string;
  line: number;
  severity: "critical" | "high" | "medium" | "low";
  category: string;
  title: string;
  body: string;
  suggestion: string | null;
  confidence: number;
  kept: boolean;
  rejected_by: string | null;
  rejected_reason: string | null;
};

export async function listRepos(uid: number) {
  return (await sql()`
    SELECT r.id::text, r.installation_id::text, r.full_name, r.private, r.enabled, i.account_login, i.avatar_url,
      COUNT(v.id)::int AS reviews,
      ROUND(AVG(v.score) FILTER (WHERE v.status = 'completed'))::int AS avg_score,
      MAX(v.created_at) AS last_review,
      COALESCE(SUM(v.findings_kept) FILTER (WHERE v.status = 'completed'), 0)::int AS open_issues
    FROM repos r
    JOIN installations i ON i.id = r.installation_id
    JOIN user_installations ui ON ui.installation_id = i.id AND ui.user_id = ${uid}
    LEFT JOIN reviews v ON v.repo_id = r.id
    GROUP BY r.id, i.account_login, i.avatar_url
    ORDER BY MAX(v.created_at) DESC NULLS LAST, r.full_name`) as RepoRow[];
}

export async function listReviews(uid: number, opts: { repo?: string; limit?: number } = {}) {
  const repo = opts.repo ?? null;
  return (await sql()`
    SELECT v.* FROM reviews v
    JOIN repos r ON r.id = v.repo_id
    JOIN user_installations ui ON ui.installation_id = r.installation_id AND ui.user_id = ${uid}
    WHERE (${repo}::text IS NULL OR v.repo_full_name = ${repo})
    ORDER BY v.created_at DESC
    LIMIT ${opts.limit ?? 50}`) as ReviewRow[];
}

export async function getReview(uid: number, id: number) {
  const rows = (await sql()`
    SELECT v.* FROM reviews v
    JOIN repos r ON r.id = v.repo_id
    JOIN user_installations ui ON ui.installation_id = r.installation_id AND ui.user_id = ${uid}
    WHERE v.id = ${id}`) as ReviewRow[];
  if (!rows[0]) return null;
  const findings = (await sql()`
    SELECT * FROM findings WHERE review_id = ${id}
    ORDER BY kept DESC, CASE severity WHEN 'critical' THEN 0 WHEN 'high' THEN 1 WHEN 'medium' THEN 2 ELSE 3 END, path, line`) as FindingRow[];
  return { review: rows[0], findings };
}

export async function getStats(uid: number) {
  const [totals] = (await sql()`
    SELECT
      COUNT(*)::int AS reviews,
      COUNT(*) FILTER (WHERE v.status = 'completed')::int AS completed,
      COALESCE(SUM(v.findings_kept), 0)::int AS issues,
      COALESCE(SUM(v.findings_raw - v.findings_kept), 0)::int AS filtered,
      COALESCE(SUM(v.findings_raw), 0)::int AS raw,
      ROUND(AVG(v.score) FILTER (WHERE v.status = 'completed'))::int AS avg_score,
      ROUND(AVG(v.duration_ms) FILTER (WHERE v.status = 'completed'))::int AS avg_ms
    FROM reviews v
    JOIN repos r ON r.id = v.repo_id
    JOIN user_installations ui ON ui.installation_id = r.installation_id AND ui.user_id = ${uid}`) as {
    reviews: number; completed: number; issues: number; filtered: number; raw: number; avg_score: number | null; avg_ms: number | null;
  }[];

  const daily = (await sql()`
    SELECT to_char(d, 'YYYY-MM-DD') AS day,
      COUNT(v.id)::int AS reviews,
      COALESCE(SUM(v.findings_kept), 0)::int AS issues,
      ROUND(AVG(v.score))::int AS score
    FROM generate_series(current_date - 29, current_date, interval '1 day') d
    LEFT JOIN (
      SELECT v.* FROM reviews v
      JOIN repos r ON r.id = v.repo_id
      JOIN user_installations ui ON ui.installation_id = r.installation_id AND ui.user_id = ${uid}
      WHERE v.status = 'completed'
    ) v ON v.created_at::date = d::date
    GROUP BY d ORDER BY d`) as { day: string; reviews: number; issues: number; score: number | null }[];

  const categories = (await sql()`
    SELECT f.category, f.severity, COUNT(*)::int AS n FROM findings f
    JOIN reviews v ON v.id = f.review_id
    JOIN repos r ON r.id = v.repo_id
    JOIN user_installations ui ON ui.installation_id = r.installation_id AND ui.user_id = ${uid}
    WHERE f.kept
    GROUP BY f.category, f.severity`) as { category: string; severity: string; n: number }[];

  const installations = (await sql()`
    SELECT COUNT(*)::int AS n FROM user_installations WHERE user_id = ${uid}`) as { n: number }[];

  return { totals, daily, categories, installations: installations[0].n };
}

export async function canAccessRepo(uid: number, fullName: string) {
  const rows = await sql()`
    SELECT r.id, r.installation_id FROM repos r
    JOIN user_installations ui ON ui.installation_id = r.installation_id AND ui.user_id = ${uid}
    WHERE r.full_name = ${fullName}`;
  return rows[0] as { id: string; installation_id: string } | undefined;
}
