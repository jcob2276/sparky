import { assertEquals } from "https://deno.land/std@0.208.0/assert/mod.ts";
import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import { buildOuraLine, fetchLatestOura } from "./ouraPlanContext.ts";

/** Atrapa zapytania do oura_daily_summary: zapisuje wybrane kolumny i filtry, zwraca zadany wynik. */
function fakeDb(result: { data: unknown; error: { message: string } | null }) {
  const calls: { select?: string; filters: Array<[string, string, unknown]>; order?: string } = { filters: [] };
  const query = {
    select(columns: string) { calls.select = columns; return query; },
    eq(column: string, value: unknown) { calls.filters.push(["eq", column, value]); return query; },
    lte(column: string, value: unknown) { calls.filters.push(["lte", column, value]); return query; },
    order(column: string) { calls.order = column; return query; },
    limit(_n: number) { return query; },
    maybeSingle() { return Promise.resolve(result); },
  };
  return { db: { from: (_table: string) => query } as unknown as SupabaseClient, calls };
}

Deno.test("the plan context reads real oura_daily_summary columns and is bounded by the planning date", async () => {
  const { db, calls } = fakeDb({ data: { date: "2026-10-28", readiness_score: 72, sleep_score: 81, total_sleep_hours: 7 }, error: null });
  const row = await fetchLatestOura(db, "u1", "2026-10-28");

  assertEquals(calls.select, "date, readiness_score, sleep_score, total_sleep_hours");
  assertEquals(calls.order, "date");
  assertEquals(calls.filters, [["eq", "user_id", "u1"], ["lte", "date", "2026-10-28"]]);
  assertEquals(row?.readiness_score, 72);
});

Deno.test("a valid measurement reaches the prompt line", () => {
  const line = buildOuraLine({ date: "2026-10-28", readiness_score: 72, sleep_score: 81, total_sleep_hours: 7 }, "2026-10-28");
  assertEquals(line, "Gotowość Oura: 72/100, Sen: 81/100");
});

Deno.test("a measurement from another day is labelled with its date", () => {
  const line = buildOuraLine({ date: "2026-10-27", readiness_score: 40, sleep_score: 55, total_sleep_hours: 5 }, "2026-10-28");
  assertEquals(line, "Gotowość Oura: 40/100, Sen: 55/100 (pomiar z 2026-10-27)");
});

Deno.test("a source error yields no measurement instead of a silent bad prompt", async () => {
  const { db } = fakeDb({ data: null, error: { message: "column does not exist" } });
  assertEquals(await fetchLatestOura(db, "u1", "2026-10-28"), null);
  assertEquals(buildOuraLine(null, "2026-10-28"), "");
});
