import type {MealPreferences} from './mealPlan.ts';
export const MEAL_PREFERENCES_KEY='health_coach:meal_preferences';
export function parseMealPreferences(raw:unknown):MealPreferences {
  if(raw == null) return {revision:0,confirmed:false,maxPrepMinutes:45,excluded:[],allergies:[],preferences:'',pattern:'any'};
  if(typeof raw === 'string') raw=JSON.parse(raw);
  if(!raw || typeof raw !== 'object' || Array.isArray(raw)) throw new Error('Nieprawidłowe preferencje żywienia.');
  const row=raw as Record<string,unknown>;
  const list=(value:unknown):value is string[]=>Array.isArray(value) && value.length<=20 && value.every(item=>typeof item === 'string' && item.trim().length>0 && item.length<=80);
  if(!Number.isInteger(row.revision) || Number(row.revision)<0 || typeof row.confirmed !== 'boolean' || ![15,30,45,60,90].includes(Number(row.maxPrepMinutes))
    || !list(row.excluded) || !list(row.allergies) || typeof row.preferences !== 'string' || row.preferences.length>1000
    || row.pattern != null && !['any','vegetarian','vegan'].includes(String(row.pattern))) throw new Error('Sprawdź czas przygotowania, wykluczenia i deklarację alergii.');
  return {revision:Number(row.revision),confirmed:row.confirmed,maxPrepMinutes:Number(row.maxPrepMinutes),excluded:row.excluded.map(value=>value.trim()),allergies:row.allergies.map(value=>value.trim()),preferences:row.preferences.trim(),pattern:(row.pattern ?? 'any') as MealPreferences['pattern']};
}
const normalized=(value:string)=>value.toLocaleLowerCase('pl').normalize('NFD').replace(/\p{M}/gu,'').replaceAll('ł','l');
const ALLERGEN_NAMES:Record<string,string[]>={
  mleko:['mleko','nabial','jogurt','twarog','ser ','kefir','maslo','smietan','serwat','kazein','whey'],
  gluten:['pszen','zyt','jeczm','owsian','bulka','chleb','makaron','kus kus','kuskus','maka'],
  jajka:['jaj','egg'],orzechy:['orzech','migdal','pistac','nerkow','pekan','nuts'],
  soja:['soj','tofu','tempeh'],ryby:['ryb','losos','tunczyk','sledz','makrel','dorsz'],
  skorupiaki:['krewet','krab','homar','rak '],mieczaki:['malz','ostryg','kalm','osmior'],
  seler:['seler'],gorczyca:['gorczyc','musztard'],sezam:['sezam','tahini'],lubin:['lubin'],siarczyny:['siarczyn'],
};
const MEAT=['kurcz','drob','wolow','wieprz','indyk','szynk','kielbas','boczek','bekon','mieso','jagniec','kacz','gesin','cielec'];
/** Name screening supplements label review. It cannot certify absence of hidden allergens or cross-contact. */
export function mealProductExcluded(name:string,prefs:Pick<MealPreferences,'excluded'>&Partial<Pick<MealPreferences,'allergies'|'pattern'>>):boolean {
  const product=normalized(name);
  const excluded=prefs.excluded.map(normalized),allergies=(prefs.allergies ?? []).flatMap(item=>{
    const key=normalized(item);return Object.hasOwn(ALLERGEN_NAMES,key)?ALLERGEN_NAMES[key]:[key];
  });
  const pattern=prefs.pattern === 'vegetarian' || prefs.pattern === 'vegan'?[...MEAT,...ALLERGEN_NAMES.ryby,...ALLERGEN_NAMES.skorupiaki,...ALLERGEN_NAMES.mieczaki]:[];
  if(prefs.pattern === 'vegan') pattern.push(...ALLERGEN_NAMES.mleko,...ALLERGEN_NAMES.jajka,'miod','zelatyn');
  return [...excluded,...allergies,...pattern].some(term=>term && product.includes(term));
}
