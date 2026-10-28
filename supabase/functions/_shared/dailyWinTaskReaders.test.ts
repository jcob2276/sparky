import { deepStrictEqual as assertEquals, ok as assert } from "node:assert";
import { createServiceClient } from "./supabase.ts";
import { fetchWorldState } from "./worldState.ts";
import { todayPlanFromWorldState } from "./promptSanitize.ts";
import { calculateGoalAlignment } from "./vanguardCoreMethods.ts";
import { runSaveDailyAggregate } from "./nightly/aggregate.ts";
import { fetchAndPrepareCorrelationData } from "./nightly/correlationsDataFetcher.ts";
import { fetchDayLoopContext } from "../vanguard-oracle/oracle/dayLoopContext.ts";
import { handleTerazCommand } from "../vanguard-telegram/_commands/teraz.ts";
import type { DailyWinTaskRow } from "./dailyWinTasks.ts";

const date = "2026-10-28";
const userId = "11111111-1111-4111-8111-111111111111";
const task = (slot: number, title: string, done: boolean, completed_at: string | null = null): DailyWinTaskRow => ({
  slot, title, done, completed_at, category: "cialo", todo_id: "todo", checkpoint_id: "checkpoint",
  pin_id: "pin", project_id: "project", target_value: "30", time_slot: "morning",
});
// Deliberately unsorted and sparse; stale parent slots must never win over child rows.
const win = {
  date, result: "W", day_note: "Notatka", journal_entry: "Dziennik", mood_score: 4, daily_rpe: 7,
  created_at: date + "T08:00:00Z", task_1: "STALE", done_1: false, done_2: true,
  daily_win_tasks: [task(5, "Odpoczynek", false), task(3, "Praca", false), task(1, "Trening", true, date + "T20:30:00Z")],
};

type Call = { table: string; method: string; body: Record<string, unknown>; url: URL };
async function withDatabase(
  rows: Record<string, unknown[]>,
  run: (db: ReturnType<typeof createServiceClient>, calls: Call[]) => Promise<void>,
) {
  const settings = { SUPABASE_URL: "https://example.supabase.co", SUPABASE_SERVICE_ROLE_KEY: "test-key", SB_SECRET_KEY: "" };
  const prior = new Map(Object.keys(settings).map((key) => [key, Deno.env.get(key)]));
  const originalFetch = globalThis.fetch;
  const calls: Call[] = [];
  for (const [key, value] of Object.entries(settings)) Deno.env.set(key, value);
  globalThis.fetch = async (input, init) => {
    const req = input instanceof Request ? input : new Request(input, init);
    const url = new URL(req.url);
    const table = url.pathname.split("/").pop()!;
    const body = req.method === "GET" ? {} : await req.json();
    calls.push({ table, method: req.method, body, url });
    if (url.hostname === "api.telegram.org") return Response.json({ ok: true });
    assertEquals(url.hostname, "example.supabase.co");
    if (table === "vanguard-oracle") return Response.json({ text: "OK" });
    return Response.json(req.method === "GET" ? rows[table] ?? [] : [], { status: req.method === "GET" ? 200 : 201 });
  };
  try {
    await run(createServiceClient(), calls);
    const reads = calls.filter((c) => c.table === "daily_wins");
    assert(reads.length > 0);
    for (const read of reads) {
      const select = read.url.searchParams.get("select") ?? "";
      assert(select.includes("daily_win_tasks("), select);
      assert(!/\b(?:task_[1-5]|done_[1-5]|category_[1-5]|completed_at_[1-5])\b/.test(select), select);
      assertEquals(read.url.searchParams.get("user_id"), `eq.${userId}`);
    }
    assertEquals(calls.filter((c) => c.table === "daily_wins" && c.method !== "GET"), []);
  } finally {
    globalThis.fetch = originalFetch;
    for (const [key, value] of prior) {
      if (value === undefined) Deno.env.delete(key); else Deno.env.set(key, value);
    }
  }
}

Deno.test("WorldState exposes compatible slots to plan and alignment consumers", async () => {
  await withDatabase({ daily_wins: [win] }, async (db, calls) => {
    const state = await fetchWorldState(db, userId, date, Date.parse(date + "T12:00:00Z"), true);
    assertEquals(state.execution.tasks_done, 1);
    assertEquals(state.execution.journal_present, true);
    const today = state.execution.today_win;
    assertEquals(today.task_1, "Trening");
    assertEquals(today.task_2, null);
    assertEquals(today.done_2, null);
    assertEquals(today.task_1_todo_id, "todo");
    assertEquals(today.task_1_checkpoint_id, "checkpoint");
    assertEquals(today.task_1_pin_id, "pin");
    assertEquals(today.task_1_project_id, "project");
    assertEquals(today.task_1_target_value, "30");
    assertEquals(today.task_1_time_slot, "morning");
    assertEquals("daily_win_tasks" in today, false);
    assertEquals(todayPlanFromWorldState({ execution: state.execution }), {
      top3: ["Trening", "Praca"], first_move_morning: "Trening", minimum_viable_day: "Trening",
      biggest_risk: null, counterplan: null, open_loops: ["Odpoczynek"],
    });
    assertEquals(calculateGoalAlignment(today).alignment_score, 33);
    const cached = calls.find((c) => c.table === "vanguard_world_state" && c.method === "POST");
    assertEquals(cached?.body.state_json, JSON.parse(JSON.stringify(state)));
  });
});

for (const dailyWins of [[], [{ ...win, daily_win_tasks: [] }], [{ ...win, daily_win_tasks: null }]]) {
  Deno.test(`WorldState handles ${dailyWins.length ? JSON.stringify(dailyWins[0].daily_win_tasks) : "missing day"} tasks`, async () => {
    await withDatabase({ daily_wins: dailyWins }, async (db) => {
      const state = await fetchWorldState(db, userId, date, undefined, true);
      assertEquals(state.execution.tasks_done, dailyWins.length ? 0 : null);
      assertEquals(todayPlanFromWorldState({ execution: state.execution }), null);
      if (!dailyWins.length) assertEquals(state.execution.today_win, null);
    });
  });
}

Deno.test("daily loop renders normalized slots, completion time and yesterday continuity", async () => {
  await withDatabase({ daily_wins: [win, { ...win, date: "2026-10-27", daily_win_tasks: [task(2, "Wczorajsze", true)] }] }, async (db) => {
    const { dayLoopContextText: text } = await fetchDayLoopContext(db, userId, date);
    assert(text.includes('Zadanie 1 [cialo]: "Trening" -> [WYKONANE (ukończono 21:30)]'), text);
    assert(text.includes("Zadanie 2: [puste]"), text);
    assert(text.includes("Bilans realizacji zadań: 1/3 ukończonych."), text);
    assert(text.includes("Wczoraj (2026-10-27): wykonano 1/1 zadań [2. Wczorajsze [OK]]"), text);
    assert(text.includes('Notatka dnia: "Notatka"'), text);
    assert(!text.includes("STALE"), text);
  });
});

Deno.test("nightly aggregate computes execution and late completion penalties from child rows", async () => {
  await withDatabase({ daily_wins: [win], daily_nutrition: [{ protein: 200 }] }, async (db, calls) => {
    await runSaveDailyAggregate(db, userId, date);
    const aggregate = calls.find((c) => c.table === "vanguard_daily_aggregates" && c.method === "POST")?.body;
    assert(aggregate);
    assertEquals(aggregate.execution_score, 0.1);
    assertEquals(aggregate.power_list_result, "W");
  });
});

Deno.test("correlations receive compatible sparse slots and unchanged header fields", async () => {
  await withDatabase({ daily_wins: [win, { date: "2026-10-27", daily_win_tasks: [] }], weather_daily: [{ date }] }, async (db) => {
    const { data } = await fetchAndPrepareCorrelationData(db, userId, "2026-08-01", date);
    const [today, empty] = data.winsRows;
    assertEquals([today.date, today.mood_score, today.daily_rpe], [date, 4, 7]);
    assertEquals([today.task_1, today.done_1, today.task_3, today.done_3], ["Trening", true, "Praca", false]);
    assertEquals([empty.task_1, empty.done_1], [null, null]);
    assertEquals("daily_win_tasks" in today, false);
  });
});

for (const dailyWins of [[win], [{ ...win, daily_win_tasks: [] }], []]) {
  Deno.test(`/teraz selects ${dailyWins[0]?.daily_win_tasks.length ? "first unfinished slot in slot order" : "todo fallback"}`, async () => {
    await withDatabase({ daily_wins: dailyWins, todo_items: [{ title: "Awaryjne", priority: "high" }] }, async (db, calls) => {
      await handleTerazCommand(123, "test-token", db, userId);
      const outbound = calls.find((c) => c.table === "outbound_messages");
      const payload = outbound?.body.payload as { body: { text: string } } | undefined;
      assert(payload);
      const expected = dailyWins[0]?.daily_win_tasks.length ? "Praca (Power List #3)" : "Awaryjne (Zadanie (high))";
      assert(payload.body.text.includes(expected), payload.body.text);
      assert(!payload.body.text.includes("STALE"));
    });
  });
}

let evalHandler: (req: Request) => Promise<Response>;
const serveDescriptor = Object.getOwnPropertyDescriptor(Deno, "serve")!;
Object.defineProperty(Deno, "serve", { configurable: true, writable: true, value: (handler: typeof evalHandler) => { evalHandler = handler; } });
try {
  await import("../vanguard-eval-runner/index.ts");
} finally {
  Object.defineProperty(Deno, "serve", serveDescriptor);
}

for (const dailyWins of [[win], []]) {
  Deno.test(`eval runner passes ${dailyWins.length ? "normalized tasks" : "missing-day fallback"} to Oracle`, async () => {
    await withDatabase({ daily_wins: dailyWins, vanguard_eval_questions: [{
      id: "question-1", question: "Test", metadata: { assertions: [{ type: "contains", value: "OK" }] },
    }] }, async (_db, calls) => {
      const response = await evalHandler(new Request("https://example.supabase.co/functions/v1/vanguard-eval-runner", {
        method: "POST", headers: { Authorization: "Bearer test-key" },
        body: JSON.stringify({ run_id: "run-1", user_id: userId }),
      }));
      assertEquals(response.status, 200);
      const oracle = calls.find((c) => c.table === "vanguard-oracle");
      assert(oracle);
      const state = oracle.body.state_vector as { discipline: { today_wins: Record<string, unknown> | string } };
      const wins = state.discipline.today_wins;
      if (dailyWins.length) {
        assertEquals(typeof wins, "object");
        assertEquals((wins as Record<string, unknown>).task_1, "Trening");
        assertEquals((wins as Record<string, unknown>).done_2, null);
        assertEquals((wins as Record<string, unknown>).result, "W");
        assertEquals("daily_win_tasks" in (wins as Record<string, unknown>), false);
      } else assertEquals(wins, "Nie ustawiono celów");
    });
  });
}
