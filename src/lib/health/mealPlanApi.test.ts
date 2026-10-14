import { beforeEach, describe, expect, it, vi } from 'vitest';
import { buildMealPlan, mealShoppingList, resizePlannedMeal } from '@vanguard/domain';
import {
  fetchMealPlanProducts,
  approveMealPlan,
  toggleShoppingItem,
  resizeMealInPlanState,
} from './mealPlanApi';
import { supabase } from '../supabase';

vi.mock('../supabase', () => ({
  supabase: {
    from: vi.fn(),
  },
}));

const products = [{id:'oats',name:'Płatki',source:'user_custom',verified:true,calories:400,protein:10,carbs:60,fat:10,fiber:8}];
const targets = [{date:'2026-10-14',calories:400,protein:10}];
const request = {notes:'Przygotuj na ciepło',days:[{date:'2026-10-14',meals:[{key:'m1',name:'Owsianka',prepMinutes:10,ingredients:[{productId:'oats',grams:100}],instructions:'Ugotuj.'}]}]};

describe('meal planning domain', () => {
  it('calculates portions from product macros and derives shopping without recording consumption', () => {
    const result = buildMealPlan(request,products,targets,{maxPrepMinutes:30,excluded:[]});
    expect(result.errors).toEqual([]);
    expect(result.plan?.days[0].totals.calories).toBe(400);
    expect(mealShoppingList(result.plan!)).toEqual([{productId:'oats',name:'Płatki',grams:100}]);
    const resized = resizePlannedMeal(result.plan!,'2026-10-14','m1',1.5);
    expect(resized.days[0].totals.calories).toBe(600);
    expect(mealShoppingList(resized)[0].grams).toBe(150);
    expect(result.plan?.days[0].totals.calories).toBe(400);
  });
  it('rejects invented products, missing days, exclusions and a recipe exceeding available time', () => {
    expect(buildMealPlan(request,[],targets,{maxPrepMinutes:30,excluded:[]}).errors.length).toBeGreaterThan(0);
    expect(buildMealPlan({...request,days:[]},products,targets,{maxPrepMinutes:30,excluded:[]}).plan).toBeNull();
    expect(buildMealPlan(request,products,targets,{maxPrepMinutes:5,excluded:['płatki']}).plan).toBeNull();
  });
});

describe('mealPlanApi client', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('fetches products from reference and user library, deduplicating case-insensitively', async () => {
    vi.mocked(supabase.from).mockImplementation(((table: string) => {
      if (table === 'food_reference_pl') {
        return {
          select: () => ({
            limit: () => Promise.resolve({
              data: [{ id: 'ref-1', name: 'Jajko kurze', calories: 143, protein: 12.5, carbs: 0.7, fat: 9.5, fiber: 0 }],
            }),
          }),
        };
      }
      if (table === 'food_library') {
        return {
          select: () => ({
            eq: () => ({
              limit: () => Promise.resolve({
                data: [
                  { id: 'lib-1', name: 'jajko kurze', calories: 140, protein: 12, carbs: 1, fat: 9, fiber: 0, source: 'manual' },
                  { id: 'lib-2', name: 'Oliwa z oliwek', calories: 884, protein: 0, carbs: 0, fat: 100, fiber: 0, brand: 'Monini', barcode: '123' },
                ],
              }),
            }),
          }),
        };
      }
      return { select: () => ({}) };
    }) as never);

    const result = await fetchMealPlanProducts('u1');
    expect(result.length).toBe(2);
    expect(result[0].name).toBe('Jajko kurze');
    expect(result[0].verified).toBe(true);
    expect(result[1].name).toBe('Oliwa z oliwek');
    expect(result[1].verified).toBe(true);
  });

  it('approves a draft plan and updates state revision', async () => {
    const draftPlan = buildMealPlan(request, products, targets, { maxPrepMinutes: 30, excluded: [] }).plan;
    let storedMealPlan: unknown = {
      revision: 1,
      draft: draftPlan,
      active: null,
      checkedProducts: [],
    };

    vi.mocked(supabase.from).mockImplementation((() => ({
      select: () => ({
        eq: () => ({
          eq: () => ({
            maybeSingle: () => Promise.resolve({ data: { meal_plan: storedMealPlan }, error: null }),
          }),
        }),
      }),
      update: (payload: { meal_plan: unknown }) => ({
        eq: () => ({
          eq: () => {
            storedMealPlan = payload.meal_plan;
            return Promise.resolve({ error: null });
          },
        }),
      }),
    })) as never);

    const approved = await approveMealPlan('u1', '2026-10-14', 'key-test');
    expect(approved.revision).toBe(2);
    expect(approved.active?.days[0].totals.calories).toBe(400);

    const toggled = await toggleShoppingItem('u1', '2026-10-14', 'oats');
    expect(toggled.checkedProducts).toContain('oats');

    const resized = await resizeMealInPlanState('u1', '2026-10-14', 'm1', 1.5);
    expect(resized.active?.days[0].totals.calories).toBe(600);
  });
});

