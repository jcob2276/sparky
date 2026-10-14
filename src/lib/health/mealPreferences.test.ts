import {describe,it,expect} from 'vitest';
import {buildMealPlan,type MealPreferences,parseMealPreferences,mealProductExcluded} from '@vanguard/domain';
describe('confirmed meal preferences',()=>{
  it('does not treat missing or malformed preferences as a confirmed absence of allergies',()=>{
    expect(parseMealPreferences(null).confirmed).toBe(false);
    expect(()=>parseMealPreferences({revision:1,confirmed:true,excluded:'milk'})).toThrow();
  });
  it('applies exclusions, declared milk allergy and vegetarian pattern to the actual ingredient list',()=>{
    const prefs:MealPreferences={revision:1,confirmed:true,maxPrepMinutes:30,excluded:['oliwa'],allergies:['mleko'],preferences:'Lubię dania na ciepło',pattern:'vegetarian'};
    expect(mealProductExcluded('Jogurt naturalny',prefs)).toBe(true);
    expect(mealProductExcluded('Pierś kurczaka',prefs)).toBe(true);
    expect(mealProductExcluded('Łosoś',prefs)).toBe(true);
    expect(mealProductExcluded('Oliwa z oliwek',prefs)).toBe(true);
    expect(mealProductExcluded('Ryż biały',prefs)).toBe(false);
    const result=buildMealPlan({days:[{date:'2026-10-14',meals:[{key:'one',name:'Jogurt',prepMinutes:1,instructions:'Podaj',ingredients:[{productId:'milk',grams:100}]}]}]},[
      {id:'milk',name:'Jogurt naturalny',source:'curated_pl',verified:true,calories:100,protein:10,carbs:10,fat:2,fiber:0},
    ],[{date:'2026-10-14',calories:100,protein:10}],prefs);
    expect(result.plan).toBeNull();
    expect(result.errors.join(' ')).toMatch(/wykluczony/i);
  });
});
