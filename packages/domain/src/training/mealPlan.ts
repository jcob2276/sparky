import {mealProductExcluded} from './mealPreferences.ts';
export interface MealPlanProduct {
  id:string; name:string; source:string; verified:boolean; calories:number; protein:number; carbs:number; fat:number; fiber:number|null;
}
export interface PlannedMacros { calories:number; protein:number; carbs:number; fat:number; fiber:number|null }
export interface MealIngredient { product:MealPlanProduct; grams:number; baseGrams?:number; macros:PlannedMacros }
export interface PlannedMeal { key:string; name:string; prepMinutes:number; instructions:string; ingredients:MealIngredient[]; totals:PlannedMacros }
export interface MealPlanDay { date:string; meals:PlannedMeal[]; totals:PlannedMacros; target:{calories:number;protein:number} }
export interface MealPlanDraft { notes:string; days:MealPlanDay[]; warnings:string[]; preferencesRevision?:number }
export interface MealPreferences { revision:number; confirmed:boolean; maxPrepMinutes:number; excluded:string[]; allergies:string[]; preferences:string; pattern?:'any'|'vegetarian'|'vegan' }
export interface MealPlanState { revision:number; draft:MealPlanDraft|null; active:MealPlanDraft|null; requestKey?:string; approvalKey?:string; checkedProducts?:string[] }
const obj = (raw:unknown): Record<string,unknown> => raw && typeof raw === 'object' && !Array.isArray(raw) ? raw as Record<string,unknown> : {};
const str = (raw:unknown) => typeof raw === 'string' ? raw.trim() : '';
const numeric = (raw:unknown) => typeof raw === 'number' && Number.isFinite(raw) ? raw : NaN;
const round = (value:number) => Math.round(value*10)/10;
function ingredient(product:MealPlanProduct,grams:number): MealIngredient {
  const per = grams/100;
  return {product,grams:round(grams),macros:{calories:round(product.calories*per),protein:round(product.protein*per),carbs:round(product.carbs*per),fat:round(product.fat*per),fiber:product.fiber == null ? null : round(product.fiber*per)}};
}
function total(rows:PlannedMacros[]): PlannedMacros {
  return {calories:round(rows.reduce((sum,row)=>sum+row.calories,0)),protein:round(rows.reduce((sum,row)=>sum+row.protein,0)),carbs:round(rows.reduce((sum,row)=>sum+row.carbs,0)),fat:round(rows.reduce((sum,row)=>sum+row.fat,0)),fiber:rows.some(row=>row.fiber == null) ? null : round(rows.reduce((sum,row)=>sum+(row.fiber ?? 0),0))};
}
/** LLM chooses product IDs and grams. All arithmetic uses the supplied owner-scoped catalog. */
export function buildMealPlan(raw:unknown,products:MealPlanProduct[],targets:Array<{date:string;calories:number;protein:number}>,preferences:Pick<MealPreferences,'maxPrepMinutes'|'excluded'>&Partial<Pick<MealPreferences,'allergies'|'pattern'>>): {plan:MealPlanDraft|null;errors:string[]} {
  const input = obj(raw), errors:string[] = [], days:MealPlanDay[] = [], seen = new Set<string>();
  const catalog = new Map(products.map(product=>[product.id,product]));
  const templates = obj(input.templates);
  for (const value of Array.isArray(input.days) ? input.days : []) {
    const day = obj(value), date = str(day.date), target = targets.find(row=>row.date === date);
    if (!target || seen.has(date)) {errors.push('Nieprawidłowa lub powtórzona data menu.');continue;}
    seen.add(date);
    const meals:PlannedMeal[] = [], keys = new Set<string>();
    for (const value of Array.isArray(day.meals) ? day.meals : []) {
      const reference = obj(value), row = {...obj(templates[str(reference.template)]),...reference};
      const key = str(row.key), name = str(row.name), prepMinutes = numeric(row.prepMinutes), instructions = str(row.instructions);
      if (!key || keys.has(key) || !name || name.length>150 || !instructions || instructions.length>2000 || !(prepMinutes>=0 && prepMinutes<=preferences.maxPrepMinutes)) errors.push('Przepis wymaga unikalnego klucza, nazwy, instrukcji i czasu w ustalonym limicie.');
      keys.add(key);
      const ingredients:MealIngredient[] = [];
      for (const value of Array.isArray(row.ingredients) ? row.ingredients : []) {
        const part = obj(value), product = catalog.get(str(part.productId)), grams = numeric(part.grams);
        if (!product || !(grams>=1 && grams<=2000)) {errors.push('Produkt spoza biblioteki lub nieprawidłowa porcja.');continue;}
        if (mealProductExcluded(product.name,preferences)) errors.push(`Wykluczony produkt: ${product.name}.`);
        ingredients.push(ingredient(product,grams));
      }
      if (!ingredients.length || ingredients.length>15) errors.push('Przepis wymaga od 1 do 15 składników.');
      meals.push({key,name,prepMinutes,instructions,ingredients,totals:total(ingredients.map(row=>row.macros))});
    }
    if (!meals.length || meals.length>8) errors.push('Dzień wymaga od 1 do 8 posiłków.');
    const totals = total(meals.map(row=>row.totals));
    if (Math.abs(totals.calories-target.calories)>target.calories*0.25 || totals.protein<target.protein*0.85) errors.push(`${date}: menu znacznie odbiega od ustalonego celu.`);
    days.push({date,meals,totals,target:{calories:target.calories,protein:target.protein}});
  }
  if (days.length !== targets.length || !days.length) errors.push('Menu musi obejmować każdy wybrany dzień.');
  return {errors:[...new Set(errors)],plan:errors.length ? null : {notes:str(input.notes).slice(0,2000),days,warnings:[
    'Makra wynikają z biblioteki produktów; gramatura, stan surowy/gotowany i etykiety wymagają przeglądu.',
    'Brak zweryfikowanej informacji o alergenach i zanieczyszczeniach krzyżowych. Sprawdź skład produktów przed zatwierdzeniem.',
    ...(products.some(product=>!product.verified) ? ['Część produktów nie ma zweryfikowanej etykiety. Wartości są szacunkowe.'] : []),
  ]}};
}
export function resizePlannedMeal(plan:MealPlanDraft,date:string,key:string,factor:number): MealPlanDraft {
  if (!Number.isFinite(factor) || factor<0.25 || factor>3) throw new Error('Mnożnik porcji musi wynosić od 0.25 do 3.');
  const days = plan.days.map(day=>{
    if (day.date !== date) return day;
    const meals = day.meals.map(meal=>{
      if (meal.key !== key) return meal;
      const ingredients = meal.ingredients.map(row=>({...ingredient(row.product,(row.baseGrams ?? row.grams)*factor),baseGrams:row.baseGrams ?? row.grams}));
      return {...meal,ingredients,totals:total(ingredients.map(row=>row.macros))};
    });
    return {...day,meals,totals:total(meals.map(row=>row.totals))};
  });
  return {...plan,days};
}
export function mealShoppingList(plan:MealPlanDraft): Array<{productId:string;name:string;grams:number}> {
  const products = new Map<string,{productId:string;name:string;grams:number}>();
  for (const day of plan.days) for (const meal of day.meals) for (const item of meal.ingredients) {
    const previous = products.get(item.product.id);
    products.set(item.product.id,{productId:item.product.id,name:item.product.name,grams:round((previous?.grams ?? 0)+item.grams)});
  }
  return [...products.values()].sort((a,b)=>a.name.localeCompare(b.name));
}
