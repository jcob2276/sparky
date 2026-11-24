import type { Recipe } from './recipeTypes';

export interface ShoppingItem {
  /** Klucz do odhaczania: stabilny dla tej samej pozycji. */
  key: string;
  name: string;
  group: string;
  /** W ilu wybranych przepisach występuje. */
  count: number;
  recipes: string[];
}

/** [wzorzec, nazwa wspólna] — łączy warianty typu „pierś z kurczaka w kostce” i „piersi z kurczaka”. */
const CANONICAL: [RegExp, string][] = [
  [/jajk|jaj\b|jajo/, 'Jajka'],
  [/kurczak|kurcz/, 'Pierś z kurczaka'],
  [/indyk/, 'Indyk'],
  [/łosoś|łososi/, 'Łosoś'],
  [/krewet/, 'Krewetki'],
  [/tuńczyk/, 'Tuńczyk w puszce'],
  [/skyr/, 'Skyr'],
  [/twar[oó]g/, 'Twaróg chudy'],
  [/serek wiejsk/, 'Serek wiejski'],
  [/jogurt/, 'Jogurt grecki'],
  [/parmezan/, 'Parmezan'],
  [/mozzarell/, 'Mozzarella light'],
  [/tortill/, 'Tortille pełnoziarniste'],
  [/płatk\w* owsian/, 'Płatki owsiane'],
  [/mielon\w* \w*\s*wołow|wołow\w* mielon/, 'Mielona wołowina'],
  [/passat/, 'Passata pomidorowa'],
  [/oliw|olej/, 'Oliwa / olej'],
  [/masło orzech/, 'Masło orzechowe 100%'],
];

const GROUPS: [RegExp, string][] = [
  [/kurczak|indyk|łosoś|krewet|tuńczyk|wołow|wieprz|szynk|boczek|dorsz|ryb|polędwic|schab|mięs|parówk|filet|pstrąg|tilapi|halibut|morszczuk|kaczk|pastrami|stek|gyoza|pierożk/, 'Mięso i ryby'],
  [/jaj|skyr|twar|serek|ser\b|sery|jogurt|mleko|parmezan|mozzarell|feta|cheddar|masło\b|śmietan|kefir/, 'Nabiał i jajka'],
  [/pomidor|sałat|szpinak|awokado|cebul|czosnek|papryk|ogór|marchew|brokuł|cukini|banan|jabł|owoc|borówk|malin|truskaw|cytryn|limon|warzyw|kapust|ziemniak|batat|grzyb|pieczark|szczypior|natk|pietruszk|kolendr|imbir/, 'Warzywa i owoce'],
  [/chleb|tortill|płatk|mąk|ryż|makaron|kasz|bułk|bagiet|wafl|musli|orzech|nasion|chia|\blen|kukurydz|fasol|ciecierz|edamame|soczewic|czekolad|skrob|biszkopt|budyń|konserw|puszk|słoik|słoicz|chrzan|ketchup|musztard|dżem|hummus/, 'Suche i konserwy'],
  [/oliw|olej|sól|pieprz|przypraw|cynamon|papryka w prosz|sos|ocet|miód|erytrytol|proszek|kakao|ziel|oregano|bazyli|curry|kumin|kurkum/, 'Spiżarnia i przyprawy'],
];

const QUANTITY = /^\s*(\d+(?:[.,]\d+)?(?:\/\d+)?\s*(?:g|kg|ml|l|szt\.?|sztuk[ia]?|opakowani[ae]|puszk[aięi]|łyżk[aięi]|łyżeczk[aięi]|garść|plasterk[ai]|ząbk[ai]|kromk[ai]|czubat\w+)?\s*)+/i;

const LEADING_MEASURE = /^\s*(?:(?:płask\w+|czubat\w+|duż\w+|mał\w+)\s+)?(?:łyżeczk\w+|łyżk\w+|garść|pęczek|szczypt\w+|odrobin\w+|kilka|kawałek|plaster\w*)\s+/i;

function cleanName(raw: string): string {
  const text = raw.replace(/\([^)]*\)/g, '').replace(QUANTITY, '').replace(LEADING_MEASURE, '').replace(/\s+/g, ' ').trim().replace(/^[,.\-\s]+|[,.\-\s]+$/g, '');
  return text.charAt(0).toLocaleUpperCase('pl') + text.slice(1);
}

function canonicalName(raw: string): string {
  const cleaned = cleanName(raw);
  const lower = cleaned.toLocaleLowerCase('pl');
  for (const [pattern, name] of CANONICAL) if (pattern.test(lower)) return name;
  return cleaned;
}

function groupOf(name: string): string {
  const lower = name.toLocaleLowerCase('pl');
  for (const [pattern, group] of GROUPS) if (pattern.test(lower)) return group;
  return 'Inne';
}

const SHOPPING_GROUP_ORDER = ['Mięso i ryby', 'Nabiał i jajka', 'Warzywa i owoce', 'Suche i konserwy', 'Spiżarnia i przyprawy', 'Inne'];

/** Łączy listy zakupów wybranych przepisów w jedną, pogrupowaną w kolejności działów sklepu. */
export function buildShoppingList(recipes: readonly Recipe[]): ShoppingItem[] {
  const items = new Map<string, ShoppingItem>();
  for (const recipe of recipes) {
    for (const raw of recipe.lidl_biedronka_basket) {
      const name = canonicalName(raw);
      if (!name) continue;
      const key = name.toLocaleLowerCase('pl');
      const existing = items.get(key);
      if (!existing) items.set(key, { key, name, group: groupOf(name), count: 1, recipes: [recipe.title] });
      else if (!existing.recipes.includes(recipe.title)) {
        existing.count += 1;
        existing.recipes.push(recipe.title);
      }
    }
  }
  return [...items.values()].sort((a, b) =>
    SHOPPING_GROUP_ORDER.indexOf(a.group) - SHOPPING_GROUP_ORDER.indexOf(b.group)
    || b.count - a.count
    || a.name.localeCompare(b.name, 'pl'));
}

/** Tekst do wklejenia w notatce lub wiadomości. */
export function shoppingListToText(items: readonly ShoppingItem[], checked: ReadonlySet<string>): string {
  const lines: string[] = [];
  let group = '';
  for (const item of items) {
    if (checked.has(item.key)) continue;
    if (item.group !== group) {
      group = item.group;
      lines.push('', `${group}:`);
    }
    lines.push(`- ${item.name}${item.count > 1 ? ` (×${item.count})` : ''}`);
  }
  return lines.join('\n').trim();
}
