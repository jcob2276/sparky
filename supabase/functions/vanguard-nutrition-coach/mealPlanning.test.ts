import { assertEquals, assert } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { generateMealPlan } from "./mealPlanning.ts";

Deno.test("generateMealPlan — returns error when catalog has no products", async () => {
  const mockSupabase = {
    from: (table: string) => ({
      select: () => ({
        limit: () => Promise.resolve({ data: [] }),
        eq: () => ({
          limit: () => Promise.resolve({ data: [] }),
        }),
      }),
    }),
  };

  const res = await generateMealPlan({
    supabase: mockSupabase,
    userId: "u1",
    apiKey: "",
    input: {
      date: "2026-10-14",
      targets: [{ date: "2026-10-14", calories: 2000, protein: 140 }],
    },
  });

  assertEquals(res.success, false);
  assert(res.errors.length > 0);
  assert(res.errors[0].includes("Brak produktów"));
});

Deno.test("generateMealPlan — fallback creates balanced plan matching target and updates draft", async () => {
  let updatedPayload: any = null;
  const mockProducts = [
    { id: "p1", name: "Płatki owsiane", calories: 370, protein: 13, carbs: 60, fat: 7, fiber: 10 },
    { id: "p2", name: "Jajka", calories: 140, protein: 12, carbs: 1, fat: 10, fiber: 0 },
    { id: "p3", name: "Oliwa", calories: 884, protein: 0, carbs: 0, fat: 100, fiber: 0 },
  ];

  const mockSupabase = {
    from: (table: string) => {
      if (table === "food_reference_pl") {
        return {
          select: () => ({
            limit: () => Promise.resolve({ data: mockProducts }),
          }),
        };
      }
      if (table === "food_library") {
        return {
          select: () => ({
            eq: () => ({
              limit: () => Promise.resolve({ data: [] }),
            }),
          }),
        };
      }
      if (table === "nutrition_targets") {
        return {
          select: () => ({
            eq: () => ({
              eq: () => ({
                maybeSingle: () => Promise.resolve({
                  data: {
                    meal_plan: {
                      revision: 1,
                      draft: null,
                      active: null,
                      checkedProducts: ["p1"],
                    },
                  },
                }),
              }),
            }),
          }),
          update: (payload: any) => {
            updatedPayload = payload;
            return {
              eq: () => ({
                eq: () => Promise.resolve({ error: null }),
              }),
            };
          },
        };
      }
      throw new Error(`Unexpected table ${table}`);
    },
  };

  const res = await generateMealPlan({
    supabase: mockSupabase,
    userId: "u1",
    apiKey: "",
    input: {
      date: "2026-10-14",
      targets: [{ date: "2026-10-14", calories: 1000, protein: 50 }],
    },
  });

  assertEquals(res.success, true);
  assert(res.state != null);
  assertEquals(res.state.revision, 2);
  assert(res.state.draft != null);
  assertEquals(res.state.checkedProducts, ["p1"]);
  assert(updatedPayload != null);
  assertEquals(updatedPayload.meal_plan.revision, 2);
});
