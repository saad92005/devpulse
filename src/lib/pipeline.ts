import "server-only";
import { parseConfig } from "./config";
import { sql } from "./db";
import { appUrl } from "./env";
import { fetchPullFiles, fetchRepoConfig, installationOctokit, postReview, reviewBody } from "./github";
import { reviewDiff } from "./review";

export type PullRequestJob = {
  installationId: number;
  repo: { id: number; fullName: string; private: boolean };
  pr: {
    number: number;
    title: string;
    body: string | null;
    author: string | null;
    url: string;
    headSha: string;
    baseRef: string;
    draft: boolean;
  };
  trigger: "opened" | "synchronize" | "reopened" | "ready_for_review" | "command" | "manual";
};

/** Records a review row. Returns null when this exact commit was already reviewed for this trigger. */
export async function enqueueReview(job: PullRequestJob): Promise<number | null> {
  const db = sql();
  await db`
    INSERT INTO repos (id, installation_id, full_name, private)
    VALUES (${job.repo.id}, ${job.installationId}, ${job.repo.fullName}, ${job.repo.private})
    ON CONFLICT (id) DO UPDATE SET full_name = EXCLUDED.full_name, installation_id = EXCLUDED.installation_id`;
  const rows = await db`
    INSERT INTO reviews (repo_id, repo_full_name, pr_number, pr_title, pr_author, pr_url, head_sha, trigger)
    VALUES (${job.repo.id}, ${job.repo.fullName}, ${job.pr.number}, ${job.pr.title}, ${job.pr.author},
            ${job.pr.url}, ${job.pr.headSha}, ${job.trigger === "command" || job.trigger === "manual" ? `${job.trigger}:${Date.now()}` : job.trigger})
    ON CONFLICT (repo_id, pr_number, head_sha, trigger) DO NOTHING
    RETURNING id`;
  return rows[0]?.id ?? null;
}

async function setStage(id: number, stage: string) {
  await sql()`UPDATE reviews SET status = 'running', stage = ${stage} WHERE id = ${id}`;
}

export async function runReview(reviewId: number, job: PullRequestJob) {
  const db = sql();
  const [owner, repo] = job.repo.fullName.split("/");
  try {
    const enabled = await db`SELECT enabled FROM repos WHERE id = ${job.repo.id}`;
    if (enabled[0] && !enabled[0].enabled) {
      await db`UPDATE reviews SET status = 'skipped', error = 'Reviews are paused for this repository', completed_at = now() WHERE id = ${reviewId}`;
      return;
    }

    await setStage(reviewId, "fetching");
    const gh = installationOctokit(job.installationId);
    const [files, configText] = await Promise.all([
      fetchPullFiles(gh, owner, repo, job.pr.number),
      fetchRepoConfig(gh, owner, repo, job.pr.baseRef),
    ]);
    const { config, error: configError } = parseConfig(configText);

    if (!config.enabled) {
      await db`UPDATE reviews SET status = 'skipped', error = 'Disabled in .devpulse.yml', completed_at = now() WHERE id = ${reviewId}`;
      return;
    }
    if (job.pr.draft && !config.review_drafts && job.trigger !== "command" && job.trigger !== "manual") {
      await db`UPDATE reviews SET status = 'skipped', error = 'Draft pull request', completed_at = now() WHERE id = ${reviewId}`;
      return;
    }

    const result = await reviewDiff(files, config, { title: job.pr.title, description: job.pr.body ?? "" }, (stage) =>
      void setStage(reviewId, stage),
    );

    await setStage(reviewId, "posting");
    const body = reviewBody(result, `${appUrl()}/dashboard/reviews/${reviewId}`, configError);
    const githubReviewId = await postReview(gh, owner, repo, job.pr.number, job.pr.headSha, result, body);

    const kept = result.findings.filter((f) => f.kept).length;
    await db`
      UPDATE reviews SET status = 'completed', stage = NULL, summary = ${result.summary}, score = ${result.score},
        files_reviewed = ${result.filesReviewed}, findings_raw = ${result.findings.length}, findings_kept = ${kept},
        duration_ms = ${result.durationMs}, model = ${result.model}, github_review_id = ${githubReviewId},
        completed_at = now()
      WHERE id = ${reviewId}`;

    for (const f of result.findings) {
      await db`
        INSERT INTO findings (review_id, path, line, severity, category, title, body, suggestion, confidence, kept, rejected_by, rejected_reason)
        VALUES (${reviewId}, ${f.path}, ${f.line}, ${f.severity}, ${f.category}, ${f.title}, ${f.body},
                ${f.suggestion ?? null}, ${f.confidence}, ${f.kept}, ${f.rejectedBy ?? null}, ${f.rejectedReason ?? null})`;
    }
  } catch (e) {
    console.error(`[devpulse] review ${reviewId} failed`, e);
    await db`UPDATE reviews SET status = 'failed', stage = NULL, error = ${(e as Error).message.slice(0, 500)}, completed_at = now() WHERE id = ${reviewId}`;
  }
}
