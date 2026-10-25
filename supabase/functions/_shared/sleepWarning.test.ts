import { assertEquals, assertStringIncludes } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { lowSleepNote } from "./sleepWarning.ts";
import { getCircadianStance } from "../vanguard-oracle/oracle/circadian.ts";

Deno.test("lowSleepNote: tylko przy krótkim śnie i bez wymyślonego procentu", () => {
  assertEquals(lowSleepNote(7.5), null);
  assertEquals(lowSleepNote(0), null);
  assertEquals(lowSleepNote(null), null);
  const note = lowSleepNote(5.2) ?? "";
  assertStringIncludes(note, "5.2h");
  assertEquals(/\d+\s?%/.test(note), false);
});

Deno.test("circadian: ostrzeżenie o śnie nie zawiera wpisanej statystyki", () => {
  const warning = getCircadianStance(9, 80, 5).biometricWarning ?? "";
  assertStringIncludes(warning, "5.0h");
  assertEquals(/\d+\s?%/.test(warning), false);
});
