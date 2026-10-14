import { describe, expect, it } from 'vitest';
import { buildMealPlan, mealShoppingList, resizePlannedMeal } from '@vanguard/domain';
const products = [{id:'oats',name:'Płatki',source:'user_custom',verified:true,calories:400,protein:10,carbs:60,fat:10,fiber:8}];
const targets = [{date:'2026-10-14',calories:400,protein:10}];
const request = {notes:'Przygotuj na ciepło',days:[{date:'2026-10-14',meals:[{key:'m1',name:'Owsianka',prepMinutes:10,ingredients:[{productId:'oats',grams:100}],instructions:'Ugotuj.'}]}]};
describe('meal planning', () => {
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
