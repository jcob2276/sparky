#!/usr/bin/env node
/**
 * Generates docs/DATA_MAP.md: for every public table/view, who touches it.
 *
 * Sources combined (a grep over the repo alone misses SQL-side consumers — that mistake
 * nearly dropped live tables on 2026-10-20, see lessons.md):
 *   - TypeScript/JS in src/, packages/, supabase/functions/, scripts/   (by identifier match)
 *   - SQL routines (pg_proc.prosrc), view definitions, pg_cron jobs      (live DB via supabase CLI)
 * If the CLI is not authenticated the DB part is skipped and the doc says so.
 *
 *   npm run docs:data-map
 */
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, relative } from "node:path";

const ROOT = process.cwd();
const PROJECT_REF = process.env.SUPABASE_PROJECT_REF || "pdvqkgfsqziqlhptatgf";

// ---------- 1. table list (offline, from generated types) ----------
const types = readFileSync("src/lib/database.types.ts", "utf8").replace(/\r/g, "");
const publicStart = types.indexOf("    Tables: {", types.indexOf("Tables: {") + 10);
const tablesEnd = types.indexOf("\n    Views:", publicStart);
const viewsEnd = types.indexOf("\n    Functions:", tablesEnd);
const names = (block) => [...block.matchAll(/^      (\w+): \{\n        Row/gm)].map((m) => m[1]);
const tables = names(types.slice(publicStart, tablesEnd)).sort();
const views = names(types.slice(tablesEnd, viewsEnd)).sort();

// ---------- 2. code references ----------
const SKIP_DIR = new Set(["node_modules", ".git", "dist", "coverage", "android", ".temp"]);
const files = [];
function walk(dir) {
  for (const e of readdirSync(dir)) {
    if (SKIP_DIR.has(e)) continue;
    const p = join(dir, e);
    let st;
    try { st = statSync(p); } catch { continue; } // dangling links / junctions
    if (st.isDirectory()) walk(p);
    else if (/\.(ts|tsx|mjs|cjs|js|py|sql)$/.test(e) && !/database\.types\.ts$/.test(e)) files.push(p);
  }
}
for (const top of ["src", "packages", "supabase/functions", "scripts"]) walk(join(ROOT, top));

const scope = (rel) => {
  const p = rel.split(String.fromCharCode(92)).join("/");
  if (!/^(src|packages|supabase\/functions|scripts)\//.test(p)) return null;
  if (/\.test\.|\/tests?\//.test(p)) return null;
  if (p.startsWith("supabase/functions/_shared/")) return "edge:_shared";
  const fn = /^supabase\/functions\/([^/]+)\//.exec(p);
  if (fn) return `edge:${fn[1]}`;
  if (p.startsWith("scripts/")) return "scripts";
  if (p.startsWith("packages/")) return `pkg:${p.split("/")[1]}`;
  const parts = p.split("/");
  return parts[1] === "lib" || parts[1] === "hooks" ? `src/${parts[1]}${parts[2] ? "/" + parts[2].replace(/\.\w+$/, "") : ""}` : `src/${parts[1]}`;
};

const sources = [];
for (const f of files) {
  const rel = relative(ROOT, f);
  const sc = scope(rel);
  if (sc) sources.push({ sc, text: readFileSync(f, "utf8") });
}

const codeRefs = new Map();
for (const name of [...tables, ...views]) {
  const re = new RegExp(String.raw`['"\x60/]${name}['"\x60?.\s,)]`);
  const set = new Set();
  for (const s of sources) if (re.test(s.text)) set.add(s.sc);
  codeRefs.set(name, [...set].sort());
}

// ---------- 3. SQL-side references (live DB) ----------
let dbNote = "";
const sqlRefs = new Map();
const cronRefs = new Map();
function dbQuery(sql) {
  const dir = mkdtempSync(join(tmpdir(), "data-map-"));
  const file = join(dir, "q.sql");
  writeFileSync(file, sql);
  const out = execFileSync("npx", ["supabase", "db", "query", "--linked", "-o", "json", "-f", file], {
    encoding: "utf8", shell: process.platform === "win32", stdio: ["ignore", "pipe", "pipe"], maxBuffer: 256 * 1024 * 1024,
  });
  return JSON.parse(out.slice(out.indexOf("{"), out.lastIndexOf("}") + 1)).rows ?? [];
}
try {
  execFileSync("npx", ["supabase", "link", "--project-ref", PROJECT_REF], { stdio: "ignore", shell: process.platform === "win32" });
  const routines = dbQuery(`SELECT p.proname AS name, p.prosrc AS src FROM pg_proc p WHERE p.pronamespace = 'public'::regnamespace`);
  const viewDefs = dbQuery(`SELECT viewname AS name, definition AS src FROM pg_views WHERE schemaname = 'public'`);
  const cron = dbQuery(`SELECT jobname AS name, command AS src FROM cron.job`);
  const add = (map, label, items) => {
    for (const t of [...tables, ...views]) {
      const re = new RegExp(String.raw`\b${t}\b`);
      for (const it of items) {
        if (it.name === t) continue;
        if (re.test(it.src ?? "")) (map.get(t) ?? map.set(t, new Set()).get(t)).add(`${label}${it.name}`);
      }
    }
  };
  add(sqlRefs, "fn:", routines);
  add(sqlRefs, "view:", viewDefs);
  add(cronRefs, "cron:", cron);
} catch (err) {
  dbNote = `> ⚠ DB-side references were skipped (${(err.stderr?.toString() || err.message).trim().split("\n")[0]}). Re-run with a logged-in Supabase CLI.\n\n`;
}

// ---------- 4. render ----------
const cell = (arr) => (arr.length ? arr.map((x) => `\`${x}\``).join(", ") : "—");
const rows = (list) =>
  list.map((t) => {
    const code = codeRefs.get(t) ?? [];
    const sql = [...(sqlRefs.get(t) ?? [])].sort();
    const cron = [...(cronRefs.get(t) ?? [])].sort();
    const flag = !code.length && !sql.length && !cron.length ? " ⚠" : "";
    return `| \`${t}\`${flag} | ${cell(code)} | ${cell([...sql, ...cron])} |`;
  }).join("\n");

const header = `# Data map

> Generated by \`npm run docs:data-map\` — do not edit by hand. Regenerate after schema or data-access changes.
> A **⚠** marks an object with no code, SQL-routine, view or cron consumer: a candidate for archiving
> (move to schema \`graveyard\`, never DROP data blindly — see \`lessons.md\`).

${dbNote}## Naming glossary (legacy names that mislead)

| Name | Actually means |
|---|---|
| \`vanguard_*\` tables/functions, \`vanguard-*\` edge functions | The original product name. The app is **Sparky**; DB/function names are kept for compatibility (renaming applied objects is not worth the risk). New objects use plain domain names (\`widget_tokens\`, \`note_folders\`). |
| \`workout_sessions.workout_day\` | The session **title** (e.g. "Push A", "Sauna"). The calendar day is \`workout_sessions.date\`. |
| \`vanguard_consolidated_activities\` | A view over \`behavior_log\` + \`workout_sessions\` only. Strava lives in \`strava_activities\` / \`strava_activities_clean\`. |
| \`strava_activities\` "Kardio" rows | Garmin cardio = sauna; mirrored into \`workout_sessions\` ("Sauna") on purpose, 1 day = 1 sauna. Do not count both. |
| \`vw_*\` **tables** (e.g. \`vw_gpw_shorts_history\`) | Real tables despite the prefix (written by \`replace_knf_snapshot\`). Check \`relkind\` before assuming it is a view. |
| Day columns | Always \`date\` typed, Warsaw-local. Derive a day from an instant with \`formatWarsawDate()\`, never \`slice(0, 10)\`. |

## Tables

| Table | Code (TS/JS) | SQL routines / views / cron |
|---|---|---|
${rows(tables)}

## Views

| View | Code (TS/JS) | SQL routines / views / cron |
|---|---|---|
${rows(views)}
`;
writeFileSync("docs/DATA_MAP.md", header);
const orphans = [...tables, ...views].filter((t) => !(codeRefs.get(t) ?? []).length && !(sqlRefs.get(t)?.size) && !(cronRefs.get(t)?.size));
console.log(`docs/DATA_MAP.md written: ${tables.length} tables, ${views.length} views, ${orphans.length} without consumers${orphans.length ? ": " + orphans.join(", ") : ""}`);
