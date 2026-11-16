#!/usr/bin/env node
/**
 * Apply supabase/migrations/*.sql using DATABASE_URL or SUPABASE_DB_PASSWORD.
 * Pooler host defaults to aws-0-us-east-2 (this project's region).
 */
import { readFileSync, readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import postgres from "postgres";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");

function loadEnvLocal() {
  try {
    const raw = readFileSync(join(root, ".env.local"), "utf8");
    for (const line of raw.split("\n")) {
      const m = line.match(/^([^#=]+)=(.*)$/);
      if (!m) continue;
      const key = m[1].trim();
      const val = m[2].trim();
      if (!process.env[key]) process.env[key] = val;
    }
  } catch {
    // optional
  }
}

loadEnvLocal();

const ref = "nnczavvwwcdzizoduger";
const password = process.env.SUPABASE_DB_PASSWORD;
const databaseUrl =
  process.env.DATABASE_URL ||
  (password
    ? `postgresql://postgres.${ref}:${encodeURIComponent(password)}@aws-0-us-east-2.pooler.supabase.com:6543/postgres`
    : null);

if (!databaseUrl) {
  console.error(
    "Set DATABASE_URL or SUPABASE_DB_PASSWORD in .env.local to apply migrations.",
  );
  process.exit(1);
}

const sql = postgres(databaseUrl, { ssl: "require", max: 1 });
const dir = join(root, "supabase/migrations");
const files = readdirSync(dir)
  .filter((f) => f.endsWith(".sql"))
  .sort();

try {
  for (const file of files) {
    const body = readFileSync(join(dir, file), "utf8");
    console.log(`Applying ${file}...`);
    await sql.unsafe(body);
    console.log(`OK ${file}`);
  }
  console.log("Migrations applied.");
} catch (e) {
  console.error("Migration failed:", e.message || e);
  process.exit(1);
} finally {
  await sql.end({ timeout: 1 });
}
