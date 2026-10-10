// Applies db/schema.sql to DATABASE_URL. Usage: npm run db:migrate
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { neon } from "@neondatabase/serverless";

process.loadEnvFile?.(".env.local");

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL is not set (put it in .env.local).");
  process.exit(1);
}

const db = neon(url);
const schema = readFileSync(join(process.cwd(), "db", "schema.sql"), "utf8");
const statements = schema
  .split(/;\s*$/m)
  .map((s) => s.replace(/^\s*--.*$/gm, "").trim())
  .filter(Boolean);

for (const stmt of statements) {
  await db.query(stmt);
}
console.log(`Applied ${statements.length} statements.`);
