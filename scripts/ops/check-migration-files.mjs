#!/usr/bin/env node
/**
 * Offline sanity check for supabase/migrations (runs on every PR, no secrets needed).
 * Fails on: bad file names, duplicate versions, non-numeric/implausible timestamps and
 * stray non-SQL files. Ledger drift against the remote project is checked separately
 * by check-migration-drift.mjs (needs SUPABASE_ACCESS_TOKEN).
 */
import { readdirSync } from "node:fs";
import { join } from "node:path";

const dir = "supabase/migrations";
const NAME = /^(\d{14})_([a-z0-9][a-z0-9_]*)\.sql$/;
const problems = [];
const seen = new Map();

for (const file of readdirSync(dir)) {
  if (file === "README.md") continue;
  const m = NAME.exec(file);
  if (!m) {
    problems.push(`${file}: name must match <14-digit timestamp>_<snake_case_name>.sql`);
    continue;
  }
  const [, version] = m;
  const year = Number(version.slice(0, 4));
  if (year < 2026 || year > 2030) problems.push(`${file}: implausible timestamp year ${year}`);
  if (seen.has(version)) problems.push(`${file}: duplicate version ${version} (also ${seen.get(version)})`);
  seen.set(version, file);
}

if (problems.length) {
  console.error("Migration file check failed:\n" + problems.map((p) => `  - ${p}`).join("\n"));
  process.exit(1);
}
console.log(`Migration files OK: ${seen.size} migrations in ${join(dir)}`);
