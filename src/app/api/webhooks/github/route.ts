import { after } from "next/server";
import { sql } from "@/lib/db";
import { installationOctokit } from "@/lib/github";
import { enqueueReview, runReview, type PullRequestJob } from "@/lib/pipeline";
import { verifySignature } from "@/lib/webhook";

// Reviews run in `after()` so GitHub gets its 202 immediately (it times out at 10s).
export const maxDuration = 300;

/* eslint-disable @typescript-eslint/no-explicit-any -- webhook payloads are large; we read a few fields */

const PR_ACTIONS = new Set(["opened", "synchronize", "reopened", "ready_for_review"]);
const COMMAND_RE = /@devpulse\s+review\b/i;

export async function POST(req: Request) {
  const body = await req.text();
  if (!verifySignature(process.env.GITHUB_WEBHOOK_SECRET ?? "", body, req.headers.get("x-hub-signature-256"))) {
    return Response.json({ error: "Invalid signature" }, { status: 401 });
  }

  const event = req.headers.get("x-github-event");
  const payload = JSON.parse(body);
  const db = sql();

  switch (event) {
    case "ping":
      return Response.json({ ok: true, pong: true });

    case "installation": {
      const inst = payload.installation;
      if (payload.action === "deleted") {
        await db`DELETE FROM installations WHERE id = ${inst.id}`;
      } else {
        await db`
          INSERT INTO installations (id, account_login, account_type, avatar_url, suspended)
          VALUES (${inst.id}, ${inst.account.login}, ${inst.account.type}, ${inst.account.avatar_url}, ${payload.action === "suspend"})
          ON CONFLICT (id) DO UPDATE SET account_login = EXCLUDED.account_login, avatar_url = EXCLUDED.avatar_url,
            suspended = EXCLUDED.suspended`;
        await upsertRepos(inst.id, payload.repositories ?? []);
        // Link the installer so the repos show up in their dashboard straight away.
        if (payload.sender?.id) {
          await db`
            INSERT INTO user_installations (user_id, installation_id)
            SELECT ${payload.sender.id}, ${inst.id} WHERE EXISTS (SELECT 1 FROM users WHERE id = ${payload.sender.id})
            ON CONFLICT DO NOTHING`;
        }
      }
      return Response.json({ ok: true });
    }

    case "installation_repositories": {
      await ensureInstallation(payload.installation);
      await upsertRepos(payload.installation.id, payload.repositories_added ?? []);
      for (const r of payload.repositories_removed ?? []) await db`DELETE FROM repos WHERE id = ${r.id}`;
      return Response.json({ ok: true });
    }

    case "pull_request": {
      if (!PR_ACTIONS.has(payload.action)) return Response.json({ ok: true, ignored: payload.action });
      await ensureInstallation(payload.installation);
      return schedule(jobFromPull(payload.installation.id, payload.repository, payload.pull_request, payload.action));
    }

    case "issue_comment": {
      if (payload.action !== "created" || !payload.issue?.pull_request || !COMMAND_RE.test(payload.comment?.body ?? "")) {
        return Response.json({ ok: true, ignored: true });
      }
      if (payload.comment.user?.type === "Bot") return Response.json({ ok: true, ignored: "bot" });
      await ensureInstallation(payload.installation);
      const gh = installationOctokit(payload.installation.id);
      const [owner, repo] = payload.repository.full_name.split("/");
      await gh.reactions
        .createForIssueComment({ owner, repo, comment_id: payload.comment.id, content: "eyes" })
        .catch(() => undefined);
      const { data: pr } = await gh.pulls.get({ owner, repo, pull_number: payload.issue.number });
      return schedule(jobFromPull(payload.installation.id, payload.repository, pr, "command"));
    }

    default:
      return Response.json({ ok: true, ignored: event });
  }
}

function jobFromPull(installationId: number, repo: any, pr: any, trigger: PullRequestJob["trigger"]): PullRequestJob {
  return {
    installationId,
    repo: { id: repo.id, fullName: repo.full_name, private: repo.private },
    pr: {
      number: pr.number,
      title: pr.title,
      body: pr.body,
      author: pr.user?.login ?? null,
      url: pr.html_url,
      headSha: pr.head.sha,
      baseRef: pr.base.ref,
      draft: Boolean(pr.draft),
    },
    trigger,
  };
}

async function schedule(job: PullRequestJob) {
  const reviewId = await enqueueReview(job);
  if (reviewId === null) return Response.json({ ok: true, duplicate: true });
  after(() => runReview(reviewId, job));
  return Response.json({ ok: true, reviewId }, { status: 202 });
}

async function ensureInstallation(inst: any) {
  if (!inst?.id) return;
  await sql()`
    INSERT INTO installations (id, account_login, account_type, avatar_url)
    VALUES (${inst.id}, ${inst.account?.login ?? "unknown"}, ${inst.account?.type ?? "User"}, ${inst.account?.avatar_url ?? null})
    ON CONFLICT (id) DO NOTHING`;
}

async function upsertRepos(installationId: number, repos: { id: number; full_name: string; private: boolean }[]) {
  for (const r of repos) {
    await sql()`
      INSERT INTO repos (id, installation_id, full_name, private)
      VALUES (${r.id}, ${installationId}, ${r.full_name}, ${r.private})
      ON CONFLICT (id) DO UPDATE SET full_name = EXCLUDED.full_name, installation_id = EXCLUDED.installation_id`;
  }
}
