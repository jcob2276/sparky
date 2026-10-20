#!/usr/bin/env node
/**
 * The ONLY supported way to apply a migration to the linked remote project.
 *
 *   npm run db:apply -- supabase/migrations/20261020150000_my_change.sql
 *
 * Why: applying through the Supabase MCP `apply_migration` tool (or the SQL editor) stamps
 * the remote ledger with a *different* timestamp than the local file, which produced 100+
 * drift rows (see lessons.md 2026-10-20). This script runs the file exactly as committed and
 * then records the file's own version in the ledger, so local == remote by construction.
 *
 * Requires SUPABASE_ACCESS_TOKEN (or a prior `supabase login`) and a linked project.
 */
import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import { basename } from "node:path";

const file = process.argv[2];
if (!file || !existsSync(file)) {
  console.error("Usage: npm run db:apply -- supabase/migrations/<timestamp>_<name>.sql");
  process.exit(1);
}
const m = /^(\d{14})_[a-z0-9][a-z0-9_]*\.sql$/.exec(basename(file));
if (!m) {
  console.error("File name must match <14-digit timestamp>_<snake_case_name>.sql");
  process.exit(1);
}
const version = m[1];
const run = (args) => execFileSync("npx", ["supabase", ...args], { encoding: "utf8", shell: process.platform === "win32" });

const ledger = run(["migration", "list", "--linked"]);
if (new RegExp(`\|\s*${version}\s*\|`).test(ledger) && new RegExp(`${version}\s*\|\s*${version}`).test(ledger)) {
  console.error(`Version ${version} is already applied remotely — nothing to do.`);
  process.exit(1);
}

console.log(`Applying ${file} ...`);
const out = run(["db", "query", "--linked", "-f", file]);
if (/"error"|ERROR/i.test(out)) {
  console.error(out);
  process.exit(1);
}
run(["migration", "repair", "--linked", "--status", "applied", version]);
console.log(`Recorded ${version} in the remote ledger. Next: npm run db:update-types && npm run db:check-drift`);
