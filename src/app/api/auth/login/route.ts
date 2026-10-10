import { randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { connection } from "next/server";
import { appUrl, githubAppConfigured } from "@/lib/env";

export async function GET() {
  await connection();
  if (!githubAppConfigured()) {
    return Response.redirect(`${appUrl()}/setup?missing=github`, 303);
  }
  const state = randomBytes(16).toString("hex");
  (await cookies()).set("dp_oauth_state", state, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 600,
    path: "/",
  });
  const url = new URL("https://github.com/login/oauth/authorize");
  url.searchParams.set("client_id", process.env.GITHUB_CLIENT_ID!);
  url.searchParams.set("redirect_uri", `${appUrl()}/api/auth/callback`);
  url.searchParams.set("state", state);
  return Response.redirect(url.toString(), 303);
}
