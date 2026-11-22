import { HttpError } from '../_shared/http.ts';

interface OpenverseResult {
  results?: Array<{
    title?: string;
    url?: string;
    thumbnail?: string;
    foreign_landing_url?: string;
    creator?: string | null;
    license?: string;
  }>;
}

const PL_TO_EN_TERMS: Record<string, string> = {
  owsianka: 'oatmeal porridge',
  płatki: 'oats',
  skyr: 'skyr yogurt',
  jogurt: 'yogurt',
  banan: 'banana',
  bananem: 'banana',
  kurczak: 'chicken breast',
  kurczaka: 'chicken breast',
  filet: 'chicken fillet',
  pierś: 'chicken breast',
  ziemniaki: 'potatoes',
  ziemniakami: 'potatoes',
  surówka: 'salad',
  surówką: 'salad',
  napój: 'protein shake',
  proteinowy: 'protein shake',
  koktajl: 'smoothie',
  białko: 'protein shake',
  jajka: 'eggs',
  jajecznica: 'scrambled eggs',
  omlet: 'omelette',
  wołowina: 'beef',
  gulasz: 'beef stew',
  stek: 'steak',
  łosoś: 'salmon',
  ryba: 'fish',
  kanapka: 'sandwich',
  kanapki: 'sandwiches',
  twaróg: 'cottage cheese',
  makaron: 'pasta',
  ryż: 'rice',
};

function translatePlToEn(text: string): string {
  const words = text.toLowerCase().split(/[\s,.-]+/);
  const translated = words.map(w => PL_TO_EN_TERMS[w] || w);
  return translated.join(' ');
}

function queryFromMeal(name: string, ingredients: string[]): string {
  const translatedName = translatePlToEn(name);
  const parts = [translatedName, ...ingredients.slice(0, 2).map(translatePlToEn)]
    .map(part => part.replace(/[^\p{L}\p{N}\s-]/gu, ' ').trim())
    .filter(Boolean);
  return `${parts.join(' ')} food plated`.slice(0, 180);
}

/** Real CC food photos for planner thumbs — not AI. Falls back across a few English queries. */
export async function resolveMealPhoto(name: unknown, ingredients: unknown) {
  if (typeof name !== 'string' || !name.trim() || name.length > 150 || !Array.isArray(ingredients) ||
    ingredients.length > 15 ||
    ingredients.some(item => typeof item !== 'string' || item.length > 180)) {
    throw new HttpError(400, 'Nieprawidłowy opis posiłku.');
  }
  const ingredientNames = ingredients.filter((item): item is string => typeof item === 'string' && item.trim().length > 0);
  const queries = [
    queryFromMeal(name, ingredientNames),
    `${name} food`,
    ingredientNames[0] ? `${ingredientNames[0]} plated food` : 'healthy plated meal',
  ];

  for (const q of queries) {
    const url = new URL('https://api.openverse.org/v1/images/');
    url.searchParams.set('q', q);
    url.searchParams.set('page_size', '8');
    url.searchParams.set('license_type', 'commercial,modification');
    url.searchParams.set('category', 'photograph');
    const response = await fetch(url, {
      headers: { Accept: 'application/json', 'User-Agent': 'SparkyMealPlanner/1.0' },
      signal: AbortSignal.timeout(12_000),
    });
    if (!response.ok) {
      console.error('Openverse status', response.status, q);
      continue;
    }
    const data = await response.json() as OpenverseResult;
    const hit = (data.results ?? []).find(row => typeof row.thumbnail === 'string' || typeof row.url === 'string');
    if (!hit) continue;
    const photoUrl = hit.thumbnail || hit.url;
    if (!photoUrl) continue;
    return {
      success: true as const,
      photoUrl,
      attribution: hit.creator ? `Zdjęcie: ${hit.creator}` : 'Zdjęcie z Openverse (licencja otwarta)',
      sourceUrl: hit.foreign_landing_url ?? null,
      license: hit.license ?? null,
    };
  }

  throw new HttpError(404, 'Nie znaleziono zdjęcia dania.');
}
