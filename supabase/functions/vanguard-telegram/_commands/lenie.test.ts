import { assertEquals } from "https://deno.land/std@0.208.0/assert/mod.ts";
import { parseLenieDate } from "./lenie.ts";

Deno.test("no prefix keeps today and the whole text", () => {
  assertEquals(parseLenieDate("nuda | w pracy", "2026-10-29"), { date: "2026-10-29", rest: "nuda | w pracy" });
});

Deno.test("wczoraj moves one day back, also across month and year boundaries", () => {
  assertEquals(parseLenieDate("wczoraj nuda", "2026-10-29"), { date: "2026-10-28", rest: "nuda" });
  assertEquals(parseLenieDate("wczoraj", "2026-11-01"), { date: "2026-10-31", rest: "" });
  assertEquals(parseLenieDate("wczoraj x", "2027-01-01"), { date: "2026-12-31", rest: "x" });
});

Deno.test("dzis and an explicit ISO date are honoured", () => {
  assertEquals(parseLenieDate("dziś stres", "2026-10-29"), { date: "2026-10-29", rest: "stres" });
  assertEquals(parseLenieDate("2026-10-20 telefon | wieczór", "2026-10-29"), { date: "2026-10-20", rest: "telefon | wieczór" });
});

Deno.test("an empty command is today with no text", () => {
  assertEquals(parseLenieDate("", "2026-10-29"), { date: "2026-10-29", rest: "" });
});
