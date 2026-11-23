/**
 * Dopełnianie makr: z Twoich produktów dobiera zestawy (1–2 pozycje), które wypełniają brakujące białko
 * w ramach pozostałych kalorii i tłuszczu. Czysty kod, bez AI i bez limitów.
 */
export interface FillCandidate {
  id: string;
  name: string;
  /** Wartości na 100 g. */
  per100: { kcal: number; protein: number; carbs: number; fat: number };
  /** Zwykła porcja w gramach (z ulubionych). */
  portionGrams: number;
}

export interface RemainingMacros {
  kcal: number;
  protein: number;
  /** null = brak celu tłuszczu. */
  fat: number | null;
  carbs: number | null;
}

export interface FillItem { id: string; name: string; grams: number; kcal: number; protein: number; carbs: number; fat: number }
export interface FillSuggestion { items: FillItem[]; kcal: number; protein: number; carbs: number; fat: number; score: number }

const PORTION_FACTORS = [0.5, 0.75, 1, 1.5, 2];
const MIN_KCAL = 80;

function option(candidate: FillCandidate, factor: number): FillItem | null {
  const grams = Math.min(600, Math.max(10, Math.round((candidate.portionGrams * factor) / 5) * 5));
  const k = grams / 100;
  const { kcal, protein, carbs, fat } = candidate.per100;
  if (![kcal, protein, carbs, fat].every(Number.isFinite)) return null;
  return { id: candidate.id, name: candidate.name, grams, kcal: Math.round(kcal * k), protein: +(protein * k).toFixed(1), carbs: +(carbs * k).toFixed(1), fat: +(fat * k).toFixed(1) };
}

function score(items: FillItem[], remaining: RemainingMacros): FillSuggestion {
  const kcal = items.reduce((s, i) => s + i.kcal, 0);
  const protein = +items.reduce((s, i) => s + i.protein, 0).toFixed(1);
  const carbs = +items.reduce((s, i) => s + i.carbs, 0).toFixed(1);
  const fat = +items.reduce((s, i) => s + i.fat, 0).toFixed(1);
  const proteinGain = remaining.protein > 0 ? 100 * Math.min(protein / remaining.protein, 1) : 0;
  const fatBudget = remaining.fat == null ? Infinity : Math.max(0, remaining.fat);
  const fatOver = Math.max(0, fat - fatBudget);
  const carbsGain = remaining.carbs != null && remaining.carbs > 0 ? 8 * Math.min(carbs / remaining.carbs, 1) : 0;
  // Gdy białko już jest, celem jest zbliżenie do pozostałych kalorii.
  const kcalFit = remaining.protein > 0 ? 0 : -Math.abs(remaining.kcal - kcal) / 10;
  const value = proteinGain + carbsGain + kcalFit - fatOver * 3 - 2 * (items.length - 1);
  return { items, kcal, protein, carbs, fat, score: value };
}

/** Do `limit` zróżnicowanych zestawów (żaden produkt nie powtarza się w dwóch propozycjach). */
export function suggestMacroFill(remaining: RemainingMacros, candidates: readonly FillCandidate[], limit = 3): FillSuggestion[] {
  if (remaining.kcal < MIN_KCAL) return [];
  const maxKcal = remaining.kcal * 1.05 + 20;
  const options = candidates.flatMap((c) => PORTION_FACTORS.map((f) => option(c, f)).filter((o): o is FillItem => o != null && o.kcal <= maxKcal));
  const pool: FillSuggestion[] = [];
  for (let i = 0; i < options.length; i++) {
    const single = score([options[i]], remaining);
    if (single.kcal >= MIN_KCAL) pool.push(single);
    for (let j = i + 1; j < options.length; j++) {
      if (options[j].id === options[i].id) continue;
      const pair = score([options[i], options[j]], remaining);
      if (pair.kcal <= maxKcal && pair.kcal >= MIN_KCAL) pool.push(pair);
    }
  }
  pool.sort((a, b) => b.score - a.score);
  const picked: FillSuggestion[] = [];
  const used = new Set<string>();
  for (const s of pool) {
    if (s.items.some((i) => used.has(i.id))) continue;
    picked.push(s);
    s.items.forEach((i) => used.add(i.id));
    if (picked.length >= limit) break;
  }
  return picked;
}
