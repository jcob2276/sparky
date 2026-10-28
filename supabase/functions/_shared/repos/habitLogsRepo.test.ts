import { assertEquals } from "https://deno.land/std@0.208.0/assert/mod.ts";
import { recordLenieEpisode } from "./habitLogsRepo.ts";

type Row = Record<string, unknown>;
type Result = { data: Row | null; error: null };

/** Minimalna atrapa klienta Supabase: tylko to, czego używa recordLenieEpisode. */
function fakeDb() {
  const tables: Record<string, Row[]> = { habits: [], habit_logs: [] };
  let sequence = 0;

  class Query implements PromiseLike<Result> {
    private filters: Array<[string, unknown]> = [];
    private op: "select" | "insert" | "update" = "select";
    private payload: Row = {};
    constructor(private table: string) {}
    select(_columns?: string) { return this; }
    eq(column: string, value: unknown) { this.filters.push([column, value]); return this; }
    insert(row: Row) { this.op = "insert"; this.payload = row; return this; }
    update(row: Row) { this.op = "update"; this.payload = row; return this; }
    maybeSingle() { return Promise.resolve(this.run()); }
    single() { return Promise.resolve(this.run()); }
    then<T1 = Result, T2 = never>(
      onfulfilled?: ((value: Result) => T1 | PromiseLike<T1>) | null,
      onrejected?: ((reason: unknown) => T2 | PromiseLike<T2>) | null,
    ): PromiseLike<T1 | T2> {
      return Promise.resolve(this.run()).then(onfulfilled, onrejected);
    }
    private matches() {
      return tables[this.table].filter((row) => this.filters.every(([column, value]) => row[column] === value));
    }
    private run(): Result {
      if (this.op === "insert") {
        const row = { id: `id-${++sequence}`, ...this.payload };
        tables[this.table].push(row);
        return { data: row, error: null };
      }
      if (this.op === "update") {
        this.matches().forEach((row) => Object.assign(row, this.payload));
        return { data: null, error: null };
      }
      return { data: this.matches()[0] ?? null, error: null };
    }
  }

  const db = { from: (table: string) => new Query(table) };
  return { db: db as unknown as Parameters<typeof recordLenieEpisode>[0], tables };
}

Deno.test("first episode creates the habit and a completed log", async () => {
  const { db, tables } = fakeDb();
  const episode = await recordLenieEpisode(db, "u1", "2026-10-28", { stimulus: "nuda", contextNote: "wieczór" });

  assertEquals(episode, { stimulus: "nuda", contextNote: "wieczór", count: 1 });
  assertEquals(tables.habits.length, 1);
  assertEquals(tables.habits[0].name, "Lenie");
  assertEquals(tables.habits[0].is_positive, false);
  assertEquals(tables.habit_logs.length, 1);
  assertEquals(tables.habit_logs[0].completed, true);
  assertEquals(tables.habit_logs[0].final_stimulus, "nuda");
});

Deno.test("a second episode on the same day appends to the existing log instead of duplicating it", async () => {
  const { db, tables } = fakeDb();
  await recordLenieEpisode(db, "u1", "2026-10-28", { stimulus: "nuda", contextNote: "rano" });
  const episode = await recordLenieEpisode(db, "u1", "2026-10-28", { stimulus: "stres", contextNote: "wieczór" });

  assertEquals(episode, { stimulus: "nuda + stres", contextNote: "rano · wieczór", count: 2 });
  assertEquals(tables.habit_logs.length, 1);
  assertEquals(tables.habit_logs[0].final_stimulus, "nuda + stres");
});

Deno.test("another date gets its own log and reuses the habit", async () => {
  const { db, tables } = fakeDb();
  await recordLenieEpisode(db, "u1", "2026-10-28", { contextNote: "dziś" });
  await recordLenieEpisode(db, "u1", "2026-10-27", { contextNote: "wczoraj" });

  assertEquals(tables.habits.length, 1);
  assertEquals(tables.habit_logs.map((row) => row.date).sort(), ["2026-10-27", "2026-10-28"]);
});

Deno.test("an episode without stimulus or context is still recorded", async () => {
  const { db, tables } = fakeDb();
  const episode = await recordLenieEpisode(db, "u1", "2026-10-28", {});

  assertEquals(episode, { stimulus: "", contextNote: "", count: 1 });
  assertEquals(tables.habit_logs[0].completed, true);
  assertEquals(tables.habit_logs[0].final_stimulus, null);
  assertEquals(tables.habit_logs[0].context_note, null);
});

Deno.test("another user's log on the same day is not touched", async () => {
  const { db, tables } = fakeDb();
  await recordLenieEpisode(db, "u1", "2026-10-28", { stimulus: "a" });
  await recordLenieEpisode(db, "u2", "2026-10-28", { stimulus: "b" });

  assertEquals(tables.habit_logs.length, 2);
  assertEquals(tables.habit_logs.map((row) => row.final_stimulus).sort(), ["a", "b"]);
});
