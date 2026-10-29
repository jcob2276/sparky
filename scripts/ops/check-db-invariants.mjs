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
  {
    // kpi_entries of the closer project are a weekly copy of closer_daily_logs (syncCloserWeeklyRollups);
    // a mismatch means two places show different numbers for the same week (incident 2026-10-25).
    name: "closer KPI weekly rollups must equal the sums of closer_daily_logs",
    sql: `WITH sums AS (
            SELECT user_id, date_trunc('week', date)::date AS ws, sum(appointments) AS appt, sum(sales_calls) AS calls,
                   sum(dials) AS dials, round(sum(coalesce(work_hours, 0))::numeric, 1) AS hours
            FROM public.closer_daily_logs GROUP BY 1, 2)
          SELECT e.week_start, k.name, e.value FROM public.kpi_entries e
          JOIN public.goal_kpis k ON k.id = e.kpi_id
          JOIN public.projects p ON p.id = k.project_id AND p.name ILIKE '%closer%'
          LEFT JOIN sums s ON s.user_id = e.user_id AND s.ws = e.week_start
          WHERE e.value IS DISTINCT FROM CASE
            WHEN k.name ILIKE '%umówie%' THEN coalesce(s.appt, 0)
            WHEN k.name ILIKE '%call%' THEN coalesce(s.calls, 0)
            WHEN k.name ILIKE '%rozmow%' OR k.name ILIKE '%dial%' THEN coalesce(s.dials, 0)
            WHEN k.name ILIKE '%godzin%' THEN coalesce(s.hours, 0)
            ELSE e.value END`,
  },
  {
    // Jedno źródło prawdy: nawyk „Lenie” (habit_logs). Kopii w behavior_log nie ma (usunięta 28.10, nazwa ujednolicona 29.10);
    // wiersz o kluczu 'lenie' (albo dawnym 'walenie') oznacza, że jakiś kod znowu zapisuje to zdarzenie obok habit_logs.
    name: "behavior_log must not hold 'lenie' (Lenie lives only in habit_logs)",
    sql: `SELECT b.date || ' ' || b.behavior_key AS issue FROM public.behavior_log b WHERE b.behavior_key IN ('lenie', 'walenie')`,
  },
  {
    // daily_nutrition jest agregatem daily_food_entries (trigger); suma wpisów dnia musi się zgadzać.
    name: "daily_nutrition calories/protein must equal the sums of daily_food_entries",
    sql: `SELECT n.date FROM public.daily_nutrition n
          JOIN (SELECT user_id, date, sum(coalesce(calories, 0)) AS kcal, sum(coalesce(protein, 0)) AS protein
                FROM public.daily_food_entries GROUP BY 1, 2) e ON e.user_id = n.user_id AND e.date = n.date
          WHERE abs(coalesce(n.calories, 0) - e.kcal) > 1 OR abs(coalesce(n.protein, 0) - e.protein) > 1`,
  },
  {
    // Sloty dnia żyją tylko w daily_win_tasks; kolumny task_N/done_N/... w daily_wins zostały usunięte (2026-10-28).
    name: "daily_wins must not carry slot columns (daily_win_tasks is the only owner)",
    sql: `SELECT column_name FROM information_schema.columns
          WHERE table_schema = 'public' AND table_name = 'daily_wins'
            AND column_name ~ '^(task|done|category|completed_at)_[1-5]$|^task_[1-5]_(todo_id|checkpoint_id|pin_id|project_id|target_value|time_slot)$'`,
  },
  {
    // oura_enhanced dubluje wynik snu i gotowość z oura_daily_summary (canonical); godziny snu różnią się z definicji
    // (suma epizodów kontra najdłuższy), więc ich tu nie porównujemy.
    name: "oura_enhanced sleep_score/readiness_score must equal oura_daily_summary",
    sql: `SELECT s.date FROM public.oura_daily_summary s JOIN public.oura_enhanced e ON e.user_id = s.user_id AND e.date = s.date
          WHERE s.sleep_score IS DISTINCT FROM e.sleep_score OR s.readiness_score IS DISTINCT FROM e.readiness_score`,
  },
  {
    // Powiązania grafu wskazują encje po nazwie (źródło). Cel bywa tekstem (np. wpis „Kondensacja”), więc nie jest sprawdzany.
    name: "vanguard_entity_links.source_entity must resolve to entities.canonical_name",
    sql: `SELECT DISTINCT l.source_entity FROM public.vanguard_entity_links l
          WHERE NOT EXISTS (SELECT 1 FROM public.entities e WHERE lower(e.canonical_name) = lower(l.source_entity))`,
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
