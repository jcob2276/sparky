/** Selected measured foods, not universal values for every variety or preparation.
 * Primary database: University of Sydney, https://glycemicindex.com/gi-search/ . */
export const GLYCEMIC_REFERENCES = [
  {id:'basmati-white-uk-10min',name:'Basmati biały, gotowany 10 min (UK)',gi:50,n:10,study:'Ranawana i wsp., Int J Food Sci Nutr 2009;60(S4):99–110'},
  {id:'basmati-brown-uk-25min',name:'Basmati brązowy, gotowany 25 min (UK)',gi:75,n:10,study:'Ranawana i wsp., Int J Food Sci Nutr 2009;60(S4):99–110'},
  {id:'steel-cut-oats-water-au',name:'Owies cięty steel-cut, owsianka na wodzie (Australia)',gi:48,n:10,study:'Sydney GI Research Service, obserwacje niepublikowane, 2003'},
  {id:'spaghetti-white-unico-ca',name:'Spaghetti białe Unico (Kanada)',gi:45,n:21,study:'Wolever i wsp., Eur J Clin Nutr 2003;57(3):475–482'},
] as const;
export type CarbDefinition='available'|'total_including_fiber'|'unknown';
export interface GlycemicIngredient {
  id:string;name:string;grams:number|null;carbsPer100g:number|null;fiberPer100g?:number|null;
  carbDefinition:CarbDefinition;referenceId:string|null;portionConfirmed:boolean;
}
export interface EstimatedGlycemicResponse {
  state:'estimated'|'partial'|'missing';estimatedLoad:number|null;knownLoad:number|null;uncovered:string[];
  coveredCount:number;totalCount:number;source:string;notice:string;
}
const valid=(value:unknown):value is number=>typeof value === 'number' && Number.isFinite(value) && value>=0;
/** GL = measured reference GI × available carbohydrates in the confirmed portion / 100.
 * Mixed-meal sum is an approximation; no personal glucose curve or peak-time prediction. */
export function estimateGlycemicResponse(items:readonly GlycemicIngredient[]):EstimatedGlycemicResponse {
  let load=0,covered=0;
  const uncovered:string[]=[];
  for(const item of items) {
    const reference=GLYCEMIC_REFERENCES.find(row=>row.id === item.referenceId);
    const fiberKnown=valid(item.fiberPer100g) && valid(item.carbsPer100g) && item.fiberPer100g<=item.carbsPer100g;
    const available=item.carbDefinition === 'available'?item.carbsPer100g:
      item.carbDefinition === 'total_including_fiber' && fiberKnown?item.carbsPer100g!-item.fiberPer100g!:null;
    if(!item.portionConfirmed || !valid(item.grams) || item.grams<=0 || !valid(available) || (available>0 && !reference)) {
      uncovered.push(item.name);continue;
    }
    load+=(reference?.gi ?? 0)*available*item.grams/10000;covered++;
  }
  const rounded=Math.round(load*10)/10;
  const complete=items.length>0 && covered === items.length;
  return {state:complete?'estimated':covered?'partial':'missing',estimatedLoad:complete?rounded:null,knownLoad:covered?rounded:null,
    coveredCount:covered,totalCount:items.length,uncovered,source:'https://glycemicindex.com/gi-search/',
    notice:'Orientacyjny ładunek glikemiczny z danych GI i porcji. Przybliżona suma składników nie przewiduje Twojej glukozy, czasu szczytu ani odpowiedzi na mieszany posiłek.'};
}
