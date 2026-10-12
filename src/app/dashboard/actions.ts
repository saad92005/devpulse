"use server";

import { after } from "next/server";
import { revalidatePath } from "next/cache";
import { sql } from "@/lib/db";
import { installationOctokit } from "@/lib/github";
import { enqueueReview, enqueueScan, runReview, runScan } from "@/lib/pipeline";
import { canAccessRepo } from "@/lib/queries";
import { getSession } from "@/lib/session";

export async function toggleRepo(fullName: string, enabled: boolean) {
  const session = await getSession();
  if (!session) throw new Error("Not signed in");
  const repo = await canAccessRepo(session.uid, fullName);
  if (!repo) throw new Error("Repository not found");
  await sql()`UPDATE repos SET enabled = ${enabled} WHERE id = ${repo.id}`;
  revalidatePath("/dashboard", "layout");
}

export async function rerunReview(fullName: string, prNumber: number): Promise<{ ok: boolean; error?: string; reviewId?: number }> {
  const session = await getSession();
  if (!session) return { ok: false, error: "Not signed in" };
  const repo = await canAccessRepo(session.uid, fullName);
  if (!repo) return { ok: false, error: "Repository not found" };

  const [owner, name] = fullName.split("/");
  const gh = installationOctokit(Number(repo.installation_id));
  const { data: pr } = await gh.pulls.get({ owner, repo: name, pull_number: prNumber });
  if (pr.state !== "open") return { ok: false, error: "This pull request is closed." };

  const job = {
    installationId: Number(repo.installation_id),
    repo: { id: Number(repo.id), fullName, private: pr.base.repo.private },
    pr: {
      number: pr.number, title: pr.title, body: pr.body, author: pr.user?.login ?? null, url: pr.html_url,
      headSha: pr.head.sha, baseRef: pr.base.ref, draft: Boolean(pr.draft),
    },
    trigger: "manual" as const,
  };
  const reviewId = await enqueueReview(job);
  if (reviewId === null) return { ok: false, error: "A review is already queued." };
  after(() => runReview(reviewId, job));
  revalidatePath("/dashboard", "layout");
  return { ok: true, reviewId };
}

export async function scanRepo(fullName: string): Promise<{ ok: boolean; error?: string; reviewId?: number }> {
  const session = await getSession();
  if (!session) return { ok: false, error: "Not signed in" };
  const repo = await canAccessRepo(session.uid, fullName);
  if (!repo) return { ok: false, error: "Repository not found" };
  const busy = await sql()`SELECT 1 FROM reviews WHERE repo_id = ${repo.id} AND pr_number = 0 AND status IN ('queued','running') AND created_at > now() - interval '10 minutes'`;
  if (busy.length) return { ok: false, error: "A scan of this repository is already running." };
  const job = { installationId: Number(repo.installation_id), repo: { id: Number(repo.id), fullName } };
  const reviewId = await enqueueScan(job);
  after(() => runScan(reviewId, job));
  revalidatePath("/dashboard", "layout");
  return { ok: true, reviewId };
}
