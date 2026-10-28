import { assertEquals } from "https://deno.land/std@0.208.0/assert/mod.ts";
import { averageOver, completeNutritionDays } from "./nutritionDays.ts";

const day = (date: string, calories: number | null, protein: number | null = 100) => ({ date, calories, protein });

Deno.test("averages come only from past days with a plausible amount of food", () => {
  const rows = [day("2026-10-26", 2200), day("2026-10-27", 200), day("2026-10-28", 500)];
  const complete = completeNutritionDays(rows, "2026-10-28");
  assertEquals(complete.map((r) => r.date), ["2026-10-26"]);
  assertEquals(averageOver(complete.map((r) => r.calories)), 2200);
});

Deno.test("today is never a complete day, even with plenty of calories", () => {
  assertEquals(completeNutritionDays([day("2026-10-28", 2600)], "2026-10-28"), []);
});

Deno.test("a full day with zero protein still counts as a day but not toward the protein average", () => {
  const complete = completeNutritionDays([day("2026-10-26", 2000, 0), day("2026-10-27", 2400, 120)], "2026-10-28");
  assertEquals(complete.length, 2);
  assertEquals(averageOver(complete.map((r) => r.protein)), 120);
});

Deno.test("empty or missing rows yield no average", () => {
  assertEquals(averageOver([]), null);
  assertEquals(completeNutritionDays(null, "2026-10-28"), []);
});
