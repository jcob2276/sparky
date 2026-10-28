import { assertEquals } from "https://deno.land/std@0.208.0/assert/mod.ts";
import { lastAvailableBiometrics, pickOuraRows } from "./worldStateOura.ts";

const row = (date: string, sleep: number, readiness = 80) => ({ date, total_sleep_hours: sleep, hrv_avg: 50, readiness_score: readiness });

Deno.test("a missing measurement for the requested day is not replaced by an earlier one", () => {
  const { exact, latest } = pickOuraRows([row("2026-10-27", 5)], "2026-10-28");
  assertEquals(exact, null);
  assertEquals(latest?.date, "2026-10-27");
});

Deno.test("a measurement from a later day never enters a historical request", () => {
  const { exact, latest } = pickOuraRows([row("2026-10-29", 9), row("2026-10-27", 5)], "2026-10-28");
  assertEquals(exact, null);
  assertEquals(latest?.date, "2026-10-27");
});

Deno.test("the exact day wins when it exists", () => {
  const { exact } = pickOuraRows([row("2026-10-28", 7), row("2026-10-27", 5)], "2026-10-28");
  assertEquals(exact?.total_sleep_hours, 7);
});

Deno.test("last available biometrics carry their own date and only appear when the day has no row", () => {
  const rows = [row("2026-10-27", 5, 40)];
  const { exact, latest } = pickOuraRows(rows, "2026-10-28");
  assertEquals(lastAvailableBiometrics(exact, latest), { date: "2026-10-27", sleep_hours: 5, hrv_avg: 50, readiness_score: 40 });

  const same = pickOuraRows([row("2026-10-28", 7), ...rows], "2026-10-28");
  assertEquals(lastAvailableBiometrics(same.exact, same.latest), null);
  assertEquals(lastAvailableBiometrics(null, null), null);
});

Deno.test("empty or missing input is handled", () => {
  assertEquals(pickOuraRows(null, "2026-10-28"), { exact: null, latest: null });
  assertEquals(pickOuraRows([], "2026-10-28"), { exact: null, latest: null });
});
