import { assertEquals } from "https://deno.land/std@0.208.0/assert/mod.ts";
import { type DailyWinTaskRow, legacySlotsFromTasks, withLegacySlots } from "./dailyWinTasks.ts";

const task = (slot: number, title: string, done: boolean): DailyWinTaskRow => ({
  slot, title, done, category: "cialo", completed_at: null, todo_id: null, checkpoint_id: null,
  pin_id: null, project_id: null, target_value: null, time_slot: null,
});

Deno.test("tasks become the legacy numbered columns", () => {
  const slots = legacySlotsFromTasks([task(1, "Trening", true), task(3, "Praca", false)]);
  assertEquals(slots.task_1, "Trening");
  assertEquals(slots.done_1, true);
  assertEquals(slots.category_1, "cialo");
  assertEquals(slots.task_3, "Praca");
  assertEquals(slots.done_3, false);
});

Deno.test("an empty slot reads as null, like an empty column", () => {
  const slots = legacySlotsFromTasks([task(1, "Trening", true)]);
  assertEquals(slots.task_2, null);
  assertEquals(slots.done_2, null);
  assertEquals(slots.task_5_todo_id, null);
});

Deno.test("missing tasks give all five slots empty", () => {
  for (const input of [null, undefined, []]) {
    const slots = legacySlotsFromTasks(input);
    assertEquals([1, 2, 3, 4, 5].every((n) => slots[`task_${n}`] === null), true);
  }
});

Deno.test("withLegacySlots keeps the header fields and drops the nested array", () => {
  const merged = withLegacySlots({ date: "2026-10-28", result: "W", daily_win_tasks: [task(2, "Kod", true)] });
  assertEquals(merged.date, "2026-10-28");
  assertEquals(merged.result, "W");
  assertEquals(merged.task_2, "Kod");
  assertEquals("daily_win_tasks" in merged, false);
});
