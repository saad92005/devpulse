import "server-only";
import { neon, type NeonQueryFunction } from "@neondatabase/serverless";

let client: NeonQueryFunction<false, false> | null = null;

export function dbConfigured() {
  return Boolean(process.env.DATABASE_URL);
}

/** Tagged-template SQL client. Throws if DATABASE_URL is not set. */
export function sql() {
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is not configured.");
  client ??= neon(process.env.DATABASE_URL);
  return client;
}
