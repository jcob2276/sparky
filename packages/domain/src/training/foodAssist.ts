export type FoodEstimateConfidence='high'|'medium'|'low';
export interface RestaurantMenuAnalysis {
  summary:string;dishes:Array<{id:string;name:string;estimatedKcal:number|null;estimatedProtein:number|null;estimatedCarbs:number|null;estimatedFat:number|null;
    whyRecommended:string;waiterTip?:string;confidence:FoodEstimateConfidence}>;userNotice:string;
}
export interface FridgeIngredientsAnalysis {
  detectedIngredients:Array<{name:string;estimatedGrams:number|null;confidence:FoodEstimateConfidence}>;
  suggestions:Array<{id:string;name:string;prepMinutes:number|null;ingredientsUsed:string[];missingIngredients:string[];estimatedKcal:number|null;protein:number|null;carbs:number|null;fat:number|null;instructions:string}>;
  uncertaintyNotice:string;
}
const record=(raw:unknown):Record<string,unknown>=>raw && typeof raw === 'object' && !Array.isArray(raw)?raw as Record<string,unknown>:{};
const text=(raw:unknown,max=1500)=>typeof raw === 'string'?raw.trim().slice(0,max):'';
const values=(raw:unknown,max=15)=>Array.isArray(raw)?raw.slice(0,max):[];
const strings=(raw:unknown)=>values(raw).map(value=>text(value,150)).filter(Boolean);
const estimate=(raw:unknown,max=5000)=>typeof raw === 'number' && Number.isFinite(raw) && raw>=0 && raw<=max?raw:null;
const confidence=(raw:unknown):FoodEstimateConfidence=>raw === 'high' || raw === 'medium'?raw:'low';
export function normalizeMenuAnalysis(raw:unknown):RestaurantMenuAnalysis {
  const input=record(raw);
  return {summary:text(input.summary),dishes:values(input.dishes,5).flatMap((item,index)=>{
    const row=record(item),name=text(row.name,150);if (!name) return [];
    return [{id:`dish-${index}`,name,estimatedKcal:estimate(row.estimatedKcal),estimatedProtein:estimate(row.estimatedProtein,300),estimatedCarbs:estimate(row.estimatedCarbs,500),estimatedFat:estimate(row.estimatedFat,300),
      whyRecommended:text(row.whyRecommended),waiterTip:text(row.waiterTip)||undefined,confidence:confidence(row.confidence)}];
  }),userNotice:'To propozycje, nie zapis spożycia. Makra są szacunkiem dla niepotwierdzonej porcji. Skład i alergeny potwierdź w restauracji.'};
}
export function normalizeFridgeAnalysis(raw:unknown):FridgeIngredientsAnalysis {
  const input=record(raw);
  return {detectedIngredients:values(input.detectedIngredients,30).flatMap(item=>{
    const row=record(item),name=text(row.name,150);return name?[{name,estimatedGrams:estimate(row.estimatedGrams,10000),confidence:confidence(row.confidence)}]:[];
  }),suggestions:values(input.suggestions,4).flatMap((item,index)=>{
    const row=record(item),name=text(row.name,150);if (!name) return [];
    return [{id:`recipe-${index}`,name,prepMinutes:estimate(row.prepMinutes,240),ingredientsUsed:strings(row.ingredientsUsed),missingIngredients:strings(row.missingIngredients),
      estimatedKcal:estimate(row.estimatedKcal),protein:estimate(row.protein,300),carbs:estimate(row.carbs,500),fat:estimate(row.fat,300),instructions:text(row.instructions)}];
  }),uncertaintyNotice:'Zdjęcie nie potwierdza ilości ani składu produktu. Sprawdź rozpoznane składniki, zważ porcje i zweryfikuj alergeny. Przepis nie zapisuje zjedzonego posiłku.'};
}
