import { assertEquals } from "https://deno.land/std@0.208.0/assert/mod.ts";
import { circadianInputs, warsawHourFor } from "./circadianInputs.ts";
import { getCircadianStance } from "./circadian.ts";

Deno.test("flat biometrics from WorldState reach the circadian block", () => {
  const inputs = circadianInputs({ date: "2026-10-28", biometrics: { sleep_hours: 5, readiness_score: 40, last_available: null } });
  assertEquals(inputs, { readinessScore: 40, sleepHours: 5 });
});

Deno.test("a poor night produces the biometric warning instead of silently dropping it", () => {
  const { readinessScore, sleepHours } = circadianInputs({ date: "2026-10-28", biometrics: { sleep_hours: 5, readiness_score: 40 } });
  const stance = getCircadianStance(10, readinessScore, sleepHours);
  assertEquals(typeof stance.biometricWarning, "string");
});

Deno.test("last night's measurement is a fallback only when the day has none", () => {
  const state = { date: "2026-10-28", biometrics: { sleep_hours: null, readiness_score: null, last_available: { date: "2026-10-27", sleep_hours: 5, readiness_score: 40 } } };
  assertEquals(circadianInputs(state), { readinessScore: 40, sleepHours: 5 });
});

Deno.test("a stale fallback older than yesterday is ignored", () => {
  const state = { date: "2026-10-28", biometrics: { sleep_hours: null, readiness_score: null, last_available: { date: "2026-10-20", sleep_hours: 5, readiness_score: 40 } } };
  assertEquals(circadianInputs(state), {});
});

Deno.test("missing or malformed state yields no inputs", () => {
  assertEquals(circadianInputs(undefined), {});
  assertEquals(circadianInputs({ biometrics: "x" }), {});
});

Deno.test("Warsaw hour follows daylight saving time instead of a fixed UTC+2", () => {
  assertEquals(warsawHourFor(new Date("2026-10-28T16:30:00Z")), 17); // CET, UTC+1
  assertEquals(warsawHourFor(new Date("2026-07-15T16:30:00Z")), 18); // CEST, UTC+2
});

Deno.test("historical replay keeps the fixed noon", () => {
  assertEquals(warsawHourFor(new Date("2026-10-28T12:00:00Z"), "2026-10-28"), 12);
});
