import type { MealPlanProduct } from './mealPlan.ts';
export function readMealCatalog(reference:Array<Record<string,unknown>>,library:Array<Record<string,unknown>>):MealPlanProduct[] {
  const seen=new Set<string>(),products:MealPlanProduct[]=[];
  for (const [rows,curated] of [[reference,true],[library,false]] as const) for (const row of rows) {
    const name=typeof row.name === 'string'?row.name.trim():'';
    if (!name || typeof row.id !== 'string' || seen.has(name.toLocaleLowerCase()) || row.validation_status === 'quarantined') continue;
    const macroKeys=['calories','protein','carbs','fat'] as const;
    if (macroKeys.some(key=>row[key] == null || row[key] === '' || !Number.isFinite(Number(row[key])) || Number(row[key])<0 || Number(row[key])>(key === 'calories'?1000:100))) continue;
    seen.add(name.toLocaleLowerCase());
    products.push({id:row.id,name,source:curated?'curated_pl':String(row.source ?? 'user_custom'),verified:curated || row.validation_status === 'verified',
      calories:Number(row.calories),protein:Number(row.protein),carbs:Number(row.carbs),fat:Number(row.fat),
      fiber:row.fiber != null && Number.isFinite(Number(row.fiber)) && Number(row.fiber)>=0 && Number(row.fiber)<=100?Number(row.fiber):null});
  }
  return products;
}
