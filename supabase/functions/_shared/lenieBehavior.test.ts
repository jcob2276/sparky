import { assertEquals } from "https://deno.land/std@0.208.0/assert/mod.ts";
import { LENIE_BEHAVIOR_KEY, lenieAsBehaviorRows } from "./lenieBehavior.ts";

Deno.test("completed Lenie days become behavior rows with the lenie key and value 1", () => {
  const rows = lenieAsBehaviorRows([{ date: "2026-10-27", completed: true }, { date: "2026-10-28", completed: true }]);
  assertEquals(rows, [
    { date: "2026-10-27", behavior_key: LENIE_BEHAVIOR_KEY, value: 1 },
    { date: "2026-10-28", behavior_key: LENIE_BEHAVIOR_KEY, value: 1 },
  ]);
});

Deno.test("an unchecked day is not an episode", () => {
  assertEquals(lenieAsBehaviorRows([{ date: "2026-10-27", completed: false }]), []);
});

Deno.test("missing input yields no rows", () => {
  assertEquals(lenieAsBehaviorRows(null), []);
  assertEquals(lenieAsBehaviorRows(undefined), []);
  assertEquals(lenieAsBehaviorRows([]), []);
});
