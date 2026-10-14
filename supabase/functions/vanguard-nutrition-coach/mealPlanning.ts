import { deepseekChat, parseJsonFromContent } from "../_shared/deepseek.ts";
import { LLM_TASKS } from "../_shared/llm/tasks.ts";
import {
  type MealPlanProduct,
  type MealPlanDraft,
  type MealPlanState,
  type MealPreferences,
  buildMealPlan,
} from "@vanguard/domain";

export interface GenerateMealPlanInput {
  date: string;
  targets: Array<{ date: string; calories: number; protein: number }>;
  preferences?: Partial<MealPreferences>;
}

async function fetchCatalogProducts(supabase: any, userId: string): Promise<MealPlanProduct[]> {
  const [refRes, libRes] = await Promise.all([
    supabase.from('food_reference_pl').select('id, name, calories, protein, carbs, fat, fiber').limit(150),
    supabase.from('food_library').select('id, name, calories, protein, carbs, fat, fiber, brand, barcode, source').eq('user_id', userId).limit(150),
  ]);

  const products: MealPlanProduct[] = [];
  const seen = new Set<string>();

  for (const row of (refRes.data ?? [])) {
    const name = String(row.name || '').trim();
    if (!name || seen.has(name.toLowerCase())) continue;
    seen.add(name.toLowerCase());
    products.push({
      id: row.id,
      name,
      source: 'curated_pl',
      verified: true,
      calories: Number(row.calories) || 0,
      protein: Number(row.protein) || 0,
      carbs: Number(row.carbs) || 0,
      fat: Number(row.fat) || 0,
      fiber: row.fiber != null ? Number(row.fiber) : null,
    });
  }

  for (const row of (libRes.data ?? [])) {
    const name = String(row.name || '').trim();
    if (!name || seen.has(name.toLowerCase())) continue;
    seen.add(name.toLowerCase());
    products.push({
      id: row.id,
      name,
      source: row.source || 'user_custom',
      verified: Boolean(row.brand || row.barcode),
      calories: Number(row.calories) || 0,
      protein: Number(row.protein) || 0,
      carbs: Number(row.carbs) || 0,
      fat: Number(row.fat) || 0,
      fiber: row.fiber != null ? Number(row.fiber) : null,
    });
  }

  return products;
}

export async function generateMealPlan(params: {
  supabase: any;
  userId: string;
  apiKey: string;
  input: GenerateMealPlanInput;
}): Promise<{ success: boolean; state: MealPlanState | null; errors: string[] }> {
  const { supabase, userId, apiKey, input } = params;
  const products = await fetchCatalogProducts(supabase, userId);
  if (!products.length) {
    return { success: false, state: null, errors: ['Brak produktów w bibliotece do ułożenia jadłospisu.'] };
  }

  const prefs: Pick<MealPreferences, 'maxPrepMinutes' | 'excluded'> = {
    maxPrepMinutes: input.preferences?.maxPrepMinutes ?? 45,
    excluded: input.preferences?.excluded ?? [],
  };

  const catalogSummary = products.slice(0, 50).map(p =>
    `ID: ${p.id} | ${p.name} | ${p.calories}kcal/100g, B:${p.protein}g, W:${p.carbs}g, T:${p.fat}g`
  ).join('\n');

  const targetsSummary = input.targets.map(t =>
    `Data: ${t.date} | Cel: ${t.calories} kcal, min. ${t.protein}g białka`
  ).join('\n');

  const SYSTEM = `Jesteś dietetykiem Sparky. Układasz realistyczny, prosty plan posiłków wyłącznie z podanych produktów.
ZASADY:
1. Używaj wyłącznie podanych ID produktów.
2. Gramatura każdego produktu od 10 do 800g.
3. Maksymalny czas przygotowania każdego posiłku: ${prefs.maxPrepMinutes} min.
4. Zwróć poprawny JSON dopasowany do schematu:
{
  "notes": "krótka uwaga o przygotowaniu",
  "days": [
    {
      "date": "YYYY-MM-DD",
      "meals": [
        {
          "key": "unikalny_klucz_posilku_np_sniadanie_1",
          "name": "Nazwa posiłku",
          "prepMinutes": 15,
          "instructions": "Krótki opis przygotowania",
          "ingredients": [
            { "productId": "id_produktu_z_katalogu", "grams": 150 }
          ]
        }
      ]
    }
  ]
}`;

  const USER = `CELE DNI:\n${targetsSummary}\n\nDOSTĘPNY KATALOG PRODUKTÓW:\n${catalogSummary}`;

  let parsed: unknown = null;
  if (apiKey) {
    try {
      const res = await deepseekChat({
        apiKey,
        ...LLM_TASKS.structured,
        temperature: 0.2,
        maxTokens: 2500,
        messages: [{ role: "system", content: SYSTEM }, { role: "user", content: USER }],
      });
      parsed = parseJsonFromContent(res.content);
    } catch (e) {
      console.error('[mealPlanning] deepseekChat failed:', (e as Error).message);
    }
  }

  // If LLM failed or not available, use deterministic fallback template
  if (!parsed) {
    const sortedByProtein = [...products].sort((a, b) => (b.protein / Math.max(1, b.calories)) - (a.protein / Math.max(1, a.calories)));
    const sortedByCarbs = [...products].sort((a, b) => (b.carbs / Math.max(1, b.calories)) - (a.carbs / Math.max(1, a.calories)));
    const sortedByFat = [...products].sort((a, b) => (b.fat / Math.max(1, b.calories)) - (a.fat / Math.max(1, a.calories)));

    const proteinSource = sortedByProtein[0] ?? products[0];
    const carbSource = sortedByCarbs.find(p => p.id !== proteinSource.id) ?? sortedByCarbs[0] ?? products[0];
    const fatSource = sortedByFat.find(p => p.id !== proteinSource.id && p.id !== carbSource.id) ?? sortedByFat[0] ?? products[0];

    parsed = {
      notes: 'Plan bazowy ze zweryfikowanych produktów.',
      days: input.targets.map(t => {
        const c = t.calories;
        const carb1 = Math.max(20, Math.min(400, Math.round((c * 0.18) / (carbSource.calories / 100))));
        const prot1 = Math.max(30, Math.min(500, Math.round((c * 0.22) / (proteinSource.calories / 100))));
        const carb2 = Math.max(20, Math.min(400, Math.round((c * 0.25) / (carbSource.calories / 100))));
        const prot2 = Math.max(30, Math.min(500, Math.round((c * 0.30) / (proteinSource.calories / 100))));
        const fat2 = Math.max(5, Math.min(80, Math.round((c * 0.05) / (fatSource.calories / 100))));

        return {
          date: t.date,
          meals: [
            {
              key: `meal_1_${t.date}`,
              name: 'Śniadanie białkowo-węglowodanowe',
              prepMinutes: 15,
              instructions: 'Połącz składniki i przygotuj na ciepło.',
              ingredients: [
                { productId: carbSource.id, grams: carb1 },
                { productId: proteinSource.id, grams: prot1 },
              ],
            },
            {
              key: `meal_2_${t.date}`,
              name: 'Główny posiłek regeneracyjny',
              prepMinutes: 25,
              instructions: 'Przygotuj na parze lub upiecz ze zdrowym tłuszczem.',
              ingredients: [
                { productId: carbSource.id, grams: carb2 },
                { productId: proteinSource.id, grams: prot2 },
                { productId: fatSource.id, grams: fat2 },
              ],
            },
          ],
        };
      }),
    };
  }

  const { plan, errors } = buildMealPlan(parsed, products, input.targets, prefs);
  if (!plan || errors.length) {
    return { success: false, state: null, errors };
  }

  // Fetch current state to increment revision and keep active
  const { data: currentTarget } = await supabase
    .from('nutrition_targets')
    .select('meal_plan')
    .eq('user_id', userId)
    .eq('date', input.date)
    .maybeSingle();

  const current = (currentTarget?.meal_plan && typeof currentTarget.meal_plan === 'object')
    ? (currentTarget.meal_plan as Record<string, unknown>)
    : null;

  const nextState: MealPlanState = {
    revision: (Number(current?.revision) || 0) + 1,
    draft: plan,
    active: (current?.active as MealPlanDraft) ?? null,
    checkedProducts: Array.isArray(current?.checkedProducts) ? (current!.checkedProducts as string[]) : [],
  };

  const { error: upErr } = await supabase
    .from('nutrition_targets')
    .update({ meal_plan: nextState as any })
    .eq('user_id', userId)
    .eq('date', input.date);

  if (upErr) {
    return { success: false, state: null, errors: [upErr.message] };
  }

  return { success: true, state: nextState, errors: [] };
}
