import { assertEquals } from "https://deno.land/std@0.208.0/assert/mod.ts";
import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import { warsawDayBoundsISO } from "@vanguard/domain";
import type { Database } from "../_shared/database.types.ts";
import { gatherWeekFacts } from "./gatherWeekFacts.ts";

type Call = { method: string; args: unknown[] };
type Recorded = Record<string, Call[]>;

/** Atrapa klienta: każde zapytanie zapisuje wywołania łańcucha i zwraca dane zadane dla tabeli (reszta: puste). */
function fakeDb(tableData: Record<string, unknown>) {
  const recorded: Recorded = {};
  const from = (table: string) => {
    const calls: Call[] = (recorded[table] ??= []);
    const data = tableData[table] ?? [];
    const chain: unknown = new Proxy(() => undefined, {
      get(_target, prop) {
        if (prop === "then") {
          const single = !Array.isArray(data);
          return (resolve: (value: unknown) => unknown) => resolve({ data: single ? data : data, error: null });
        }
        return (...args: unknown[]) => { calls.push({ method: String(prop), args }); return chain; };
      },
    });
    return chain;
  };
  return { db: { from } as unknown as SupabaseClient<Database>, recorded };
}

const WEEK = "2026-10-26"; // poniedziałek
const END = "2026-11-01";

Deno.test("week time ranges use Warsaw day boundaries, not bare dates or UTC midnight", async () => {
  const { db, recorded } = fakeDb({});
  await gatherWeekFacts(db, "u1", WEEK);
  const from = warsawDayBoundsISO(WEEK).fromISO;
  const to = warsawDayBoundsISO(END).toISO;
  for (const [table, column] of [["vanguard_stream", "timestamp"], ["claims", "learned_at"], ["todo_items", "updated_at"], ["strava_activities_clean", "start_date"]]) {
    const calls = recorded[table] ?? [];
    const gte = calls.find((c) => c.method === "gte" && c.args[0] === column);
    const lte = calls.find((c) => c.method === "lte" && c.args[0] === column);
    assertEquals(gte?.args[1], from, `${table}.${column} lower bound`);
    assertEquals(lte?.args[1], to, `${table}.${column} upper bound`);
  }
});

Deno.test("an event shortly after Warsaw midnight on Monday falls inside the week window", () => {
  const { fromISO } = warsawDayBoundsISO(WEEK);
  const event = new Date("2026-10-25T23:30:00Z").getTime(); // 00:30 w poniedziałek 26.10 (CET)
  assertEquals(event >= new Date(fromISO).getTime(), true);
});

Deno.test("nutrition averages use only past full days and the day count matches", async () => {
  const { db } = fakeDb({
    daily_nutrition: [
      { date: "2026-10-26", calories: 2200, protein: 140 },
      { date: "2026-10-27", calories: 200, protein: 10 },
    ],
  });
  const facts = await gatherWeekFacts(db, "u1", WEEK);
  assertEquals(facts.avgKcal, 2200);
  assertEquals(facts.avgProtein, 140);
  assertEquals(facts.nutritionDays, 1);
});

Deno.test("the calorie target is read by the shared rule: latest row up to the end of the week", async () => {
  const { db, recorded } = fakeDb({ nutrition_targets: { target_kcal: 2200 } });
  const facts = await gatherWeekFacts(db, "u1", WEEK);
  const calls = recorded["nutrition_targets"] ?? [];
  assertEquals(calls.some((c) => c.method === "lte" && c.args[0] === "date" && c.args[1] === END), true);
  assertEquals(facts.targetKcal, 2200);
});

Deno.test("weekly facts count nested tasks in sparse slots and preserve day notes and recurrence", async () => {
  const task = { completed_at: null, todo_id: null, checkpoint_id: null, pin_id: null,
    project_id: "p1", target_value: "3", time_slot: "morning" };
  const { db, recorded } = fakeDb({ daily_wins: [
    { date: WEEK, result: "Z", day_note: "Good day", daily_win_tasks: [
      { ...task, slot: 5, title: "Calls", done: true, category: "konto" },
      { ...task, slot: 2, title: "Run", done: false, category: "cialo" },
    ] },
    { date: "2026-10-27", result: null, day_note: null, daily_win_tasks: [
      { ...task, slot: 1, title: "Calls", done: false, category: "konto" },
    ] },
    { date: "2026-10-28", result: null, day_note: null, daily_win_tasks: [] },
  ] });
  const facts = await gatherWeekFacts(db, "u1", WEEK);
  assertEquals(facts.pillarTally, { cialo: { done: 0, total: 1 }, duch: { done: 0, total: 0 }, konto: { done: 1, total: 2 } });
  assertEquals(facts.taskRecurrence[0], { title: "Calls", total: 2, done: 1, rate: 50, history: `${WEEK}(✓), 2026-10-27(✗)` });
  assertEquals(facts.dayLines[0], `${WEEK} [Z]: Run [Ciało]: ✗ · Calls [Konto]: ✓ [nota: Good day]`);
  assertEquals(facts.dayNotes, [{ date: WEEK, note: "Good day" }]);
  assertEquals(facts.daysWithoutNote, ["2026-10-27", "2026-10-28"]);
  const select = String(recorded.daily_wins.find(c => c.method === "select")?.args[0]);
  assertEquals(select.includes("daily_win_tasks("), true);
  assertEquals(/\b(task_[1-5]|done_[1-5]|category_[1-5])\b/.test(select), false);
});
