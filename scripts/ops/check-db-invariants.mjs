#!/usr/bin/env node
/**
 * Data-integrity & security invariants for the linked Supabase project.
 * Every check is a read-only SQL query that must return ZERO rows. The checks encode the
 * incidents fixed on 2026-10-20 (see lessons.md) so they cannot silently regress.
 *
 *   npm run db:check-invariants
 *
 * Requires SUPABASE_ACCESS_TOKEN (CI secret) or a prior `supabase login`, project linked.
 * Allowlists are explicit and short on purpose: adding to one needs a reason in this file.
 */
import { execFileSync } from "node:child_process";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const PROJECT_REF = process.env.SUPABASE_PROJECT_REF || "pdvqkgfsqziqlhptatgf";

// System tables whose rows legitimately have no owner (cron / service events).
const NULLABLE_USER_ID = ["audit_events", "outbound_messages", "vanguard_llm_usage"];

const USER_TABLES = `
  SELECT c.oid, c.relname FROM pg_class c
  JOIN pg_attribute a ON a.attrelid = c.oid AND a.attname = 'user_id' AND NOT a.attisdropped
  WHERE c.relnamespace = 'public'::regnamespace AND c.relkind = 'r'`;

const CHECKS = [
  {
    name: "tables with user_id must have RLS enabled",
    sql: `SELECT t.relname FROM (${USER_TABLES}) t JOIN pg_class c ON c.oid = t.oid WHERE NOT c.relrowsecurity`,
  },
  {
    name: "tables with user_id must reference auth.users",
    sql: `SELECT t.relname FROM (${USER_TABLES}) t WHERE NOT EXISTS (
            SELECT 1 FROM pg_constraint k JOIN pg_attribute a ON a.attrelid = t.oid AND a.attname = 'user_id'
            WHERE k.conrelid = t.oid AND k.contype = 'f' AND a.attnum = ANY (k.conkey))`,
  },
  {
    name: `user_id must be NOT NULL (except ${NULLABLE_USER_ID.join(", ")})`,
    sql: `SELECT t.relname FROM (${USER_TABLES}) t JOIN pg_attribute a ON a.attrelid = t.oid AND a.attname = 'user_id'
          WHERE NOT a.attnotnull AND t.relname NOT IN (${NULLABLE_USER_ID.map((n) => `'${n}'`).join(",")})`,
  },
  {
    name: "every public table has a primary key",
    sql: `SELECT c.relname FROM pg_class c WHERE c.relnamespace = 'public'::regnamespace AND c.relkind = 'r'
          AND NOT EXISTS (SELECT 1 FROM pg_constraint k WHERE k.conrelid = c.oid AND k.contype = 'p')`,
  },
  {
    name: "RLS policies must wrap auth.uid()/auth.role() in (select ...) (initplan)",
    sql: `WITH x AS (SELECT tablename, policyname,
                   replace(replace(lower(coalesce(qual,'') || ' ' || coalesce(with_check,'')), 'select auth.uid()', ''), 'select auth.role()', '') AS rest
                 FROM pg_policies WHERE schemaname = 'public')
          SELECT tablename || '.' || policyname AS policy FROM x
          WHERE position('auth.uid()' in rest) > 0 OR position('auth.role()' in rest) > 0`,
  },
  {
    name: "no overlapping permissive policies per table/command (service_role bypasses RLS: do not add policies for it)",
    sql: `WITH p AS (SELECT tablename, policyname, unnest(CASE WHEN cmd = 'ALL' THEN ARRAY['SELECT','INSERT','UPDATE','DELETE'] ELSE ARRAY[cmd] END) eff
                 FROM pg_policies WHERE schemaname = 'public' AND permissive = 'PERMISSIVE')
          SELECT tablename || ' / ' || eff AS overlap FROM p GROUP BY tablename, eff HAVING count(*) > 1`,
  },
  {
    name: "no SECURITY DEFINER function in public is executable by anon",
    sql: `SELECT p.oid::regprocedure::text AS fn FROM pg_proc p WHERE p.pronamespace = 'public'::regnamespace
          AND p.prosecdef AND has_function_privilege('anon', p.oid, 'execute')`,
  },
  {
    name: "SECURITY DEFINER functions must pin search_path",
    sql: `SELECT p.oid::regprocedure::text AS fn FROM pg_proc p WHERE p.pronamespace = 'public'::regnamespace
          AND p.prosecdef AND NOT EXISTS (SELECT 1 FROM unnest(coalesce(p.proconfig, '{}')) c WHERE c LIKE 'search_path=%')`,
  },
  {
    name: "SECURITY DEFINER functions taking p_user_id and callable by authenticated must check auth.uid()",
    sql: `SELECT p.oid::regprocedure::text AS fn FROM pg_proc p WHERE p.pronamespace = 'public'::regnamespace
          AND p.prosecdef AND pg_get_function_arguments(p.oid) ~ 'p_user_id'
          AND has_function_privilege('authenticated', p.oid, 'execute') AND position('auth.uid()' in lower(p.prosrc)) = 0`,
  },
  {
    name: "views must not grant write privileges to anon/authenticated",
    sql: `SELECT DISTINCT g.table_name || ' (' || g.grantee || ':' || g.privilege_type || ')' AS grant_
          FROM information_schema.role_table_grants g JOIN pg_class c ON c.relname = g.table_name AND c.relnamespace = 'public'::regnamespace
          WHERE g.table_schema = 'public' AND c.relkind = 'v' AND g.grantee IN ('anon','authenticated')
          AND g.privilege_type IN ('INSERT','UPDATE','DELETE','TRUNCATE')`,
  },
  {
    name: "public views must be security_invoker",
    sql: `SELECT c.relname FROM pg_class c WHERE c.relnamespace = 'public'::regnamespace AND c.relkind = 'v'
          AND NOT (coalesce(c.reloptions, '{}') && ARRAY['security_invoker=true','security_invoker=on'])`,
  },
  {
    name: "day columns (date / *_date) must have a date type, not text",
    sql: `SELECT c.relname || '.' || a.attname AS col FROM pg_class c JOIN pg_attribute a ON a.attrelid = c.oid
          AND a.attnum > 0 AND NOT a.attisdropped JOIN pg_type t ON t.oid = a.atttypid
          WHERE c.relnamespace = 'public'::regnamespace AND c.relkind = 'r' AND t.typname IN ('text','varchar')
          AND a.attname ~ '^(date|[a-z]+_date)$'`,
  },
  {
    name: "timestamp columns must be timestamptz",
    sql: `SELECT c.relname || '.' || a.attname AS col FROM pg_class c JOIN pg_attribute a ON a.attrelid = c.oid
          AND a.attnum > 0 AND NOT a.attisdropped JOIN pg_type t ON t.oid = a.atttypid
          WHERE c.relnamespace = 'public'::regnamespace AND c.relkind = 'r' AND t.typname = 'timestamp'`,
  },
];

const npx = (args) => execFileSync("npx", ["supabase", ...args], { encoding: "utf8", shell: process.platform === "win32", stdio: ["ignore", "pipe", "pipe"] });

try {
  npx(["link", "--project-ref", PROJECT_REF]);
} catch (err) {
  console.error("Failed to link Supabase project — is SUPABASE_ACCESS_TOKEN set?\n" + (err.stderr?.toString() || err.message));
  process.exit(1);
}

const dir = mkdtempSync(join(tmpdir(), "db-invariants-"));
let failed = 0;
for (const [i, check] of CHECKS.entries()) {
  const file = join(dir, `check-${i}.sql`);
  writeFileSync(file, check.sql);
  let rows;
  try {
    const out = npx(["db", "query", "--linked", "-o", "json", "-f", file]);
    rows = JSON.parse(out.slice(out.indexOf("{"), out.lastIndexOf("}") + 1)).rows ?? [];
  } catch (err) {
    console.error(`✖ ${check.name}\n    query failed: ${(err.stderr?.toString() || err.message).trim().split("\n")[0]}`);
    failed++;
    continue;
  }
  if (rows.length === 0) {
    console.log(`✓ ${check.name}`);
  } else {
    failed++;
    console.error(`✖ ${check.name}`);
    for (const r of rows.slice(0, 20)) console.error("    - " + Object.values(r).join(" "));
    if (rows.length > 20) console.error(`    … and ${rows.length - 20} more`);
  }
}

if (failed) {
  console.error(`\n${failed} invariant(s) violated.`);
  process.exit(1);
}
console.log(`\nAll ${CHECKS.length} DB invariants hold.`);
