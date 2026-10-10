import { cookies } from "next/headers";
import { Octokit } from "@octokit/rest";
import { sql } from "@/lib/db";
import { appUrl } from "@/lib/env";
import { exchangeCode, installationOctokit } from "@/lib/github";
import { createSession } from "@/lib/session";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const jar = await cookies();
  const expected = jar.get("dp_oauth_state")?.value;
  jar.delete("dp_oauth_state");

  // GitHub also lands here after an install when "Request user authorization" is on;
  // in that flow there is no state cookie, so we only enforce it when one was set.
  if (!code || (expected && state !== expected)) {
    return Response.redirect(`${appUrl()}/?error=login`, 303);
  }

  try {
    const token = await exchangeCode(code);
    const gh = new Octokit({ auth: token });
    const { data: user } = await gh.users.getAuthenticated();
    const db = sql();

    await db`
      INSERT INTO users (id, login, name, avatar_url) VALUES (${user.id}, ${user.login}, ${user.name}, ${user.avatar_url})
      ON CONFLICT (id) DO UPDATE SET login = EXCLUDED.login, name = EXCLUDED.name, avatar_url = EXCLUDED.avatar_url, last_login = now()`;

    // Installations this user can access; rebuild the mapping from scratch each login.
    const installs = await gh.paginate(gh.apps.listInstallationsForAuthenticatedUser, { per_page: 100 });
    await db`DELETE FROM user_installations WHERE user_id = ${user.id}`;
    for (const inst of installs) {
      const account = inst.account as { login?: string; slug?: string; avatar_url?: string } | null;
      const login = account?.login ?? account?.slug ?? "unknown";
      await db`
        INSERT INTO installations (id, account_login, account_type, avatar_url, suspended)
        VALUES (${inst.id}, ${login}, ${inst.target_type}, ${account?.avatar_url ?? null}, ${Boolean(inst.suspended_at)})
        ON CONFLICT (id) DO UPDATE SET account_login = EXCLUDED.account_login, suspended = EXCLUDED.suspended`;
      await db`INSERT INTO user_installations (user_id, installation_id) VALUES (${user.id}, ${inst.id}) ON CONFLICT DO NOTHING`;

      // Sync repos too, in case webhooks were missed (e.g. installed before deploy).
      try {
        const appGh = installationOctokit(inst.id);
        const repos = await appGh.paginate(appGh.apps.listReposAccessibleToInstallation, { per_page: 100 });
        for (const r of repos) {
          await db`
            INSERT INTO repos (id, installation_id, full_name, private) VALUES (${r.id}, ${inst.id}, ${r.full_name}, ${r.private})
            ON CONFLICT (id) DO UPDATE SET full_name = EXCLUDED.full_name, installation_id = EXCLUDED.installation_id`;
        }
      } catch (e) {
        console.error("[devpulse] repo sync failed for installation", inst.id, e);
      }
    }

    await createSession({ uid: user.id, login: user.login, avatar: user.avatar_url });
    return Response.redirect(`${appUrl()}/dashboard`, 303);
  } catch (e) {
    console.error("[devpulse] login failed", e);
    return Response.redirect(`${appUrl()}/?error=login`, 303);
  }
}
