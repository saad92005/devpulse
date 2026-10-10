"use server";

import { after } from "next/server";
import { revalidatePath } from "next/cache";
import { sql } from "@/lib/db";
import { installationOctokit } from "@/lib/github";
import { enqueueReview, runReview } from "@/lib/pipeline";
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
