import { assertEquals } from "https://deno.land/std@0.208.0/assert/mod.ts";
import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import type { Database } from "./database.types.ts";
import { targetForDay } from "./nutritionTargetForDay.ts";

type Row = { date: string; target_kcal: number };

/** Atrapa nutrition_targets: stosuje te same filtry (user, date <= dzień, malejąco, limit 1) na zadanych wierszach. */
function fakeDb(rows: Array<Row & { user_id: string }>) {
  const state: { user?: string; lte?: string; desc?: boolean; limit?: number; table?: string } = {};
  const query = {
    select(_columns: string) { return query; },
    eq(_column: string, value: string) { state.user = value; return query; },
    lte(_column: string, value: string) { state.lte = value; return query; },
    order(_column: string, opts: { ascending: boolean }) { state.desc = !opts.ascending; return query; },
    limit(n: number) { state.limit = n; return query; },
    maybeSingle() {
      const hit = rows.filter((r) => r.user_id === state.user && (!state.lte || r.date <= state.lte))
        .sort((a, b) => (state.desc ? b.date.localeCompare(a.date) : a.date.localeCompare(b.date)))[0];
      return Promise.resolve({ data: hit ?? null, error: null });
    },
  };
  const db = { from: (table: string) => { state.table = table; return query; } } as unknown as SupabaseClient<Database>;
  return { db, state };
}

const rows = [
  { user_id: "u1", date: "2026-10-01", target_kcal: 2200 },
  { user_id: "u1", date: "2026-10-29", target_kcal: 2700 },
  { user_id: "u2", date: "2026-10-20", target_kcal: 1800 },
];

Deno.test("the target in force on a day is the latest row up to that day", async () => {
  const { db, state } = fakeDb(rows);
  const { data } = await targetForDay(db, "u1", "2026-10-28", "target_kcal");
  assertEquals((data as unknown as Row).target_kcal, 2200);
  assertEquals(state.table, "nutrition_targets");
  assertEquals(state.limit, 1);
});

Deno.test("a day without its own row still gets the target in force (not null)", async () => {
  const { db } = fakeDb(rows);
  const { data } = await targetForDay(db, "u1", "2026-10-15", "target_kcal");
  assertEquals((data as unknown as Row).target_kcal, 2200);
});

Deno.test("a target written ahead of time applies from its own day", async () => {
  const { db } = fakeDb(rows);
  const { data } = await targetForDay(db, "u1", "2026-10-29", "target_kcal");
  assertEquals((data as unknown as Row).target_kcal, 2700);
});

Deno.test("no target yet and other users' targets yield null", async () => {
  const { db } = fakeDb(rows);
  assertEquals((await targetForDay(db, "u1", "2026-09-01", "target_kcal")).data, null);
  assertEquals((await targetForDay(db, "u3", "2026-10-28", "target_kcal")).data, null);
});
