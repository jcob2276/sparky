/**
 * @module usdaMatch
 * @role Dobór pozycji USDA do angielskiej nazwy z parsera. Opisy USDA mają stałą składnię „Rodzaj, odmiana, stan”
 *       („Rice, white, long-grain, cooked”), więc zgodność rodzaju (pierwszy człon) i stanu obróbki (raw/cooked/...)
 *       decyduje o wyniku; samo podobieństwo tekstu myliłoby surowy ryż z gotowym.
 */

export interface UsdaCandidate {
  fdcId: number;
  description: string;
  dataType: 'foundation_food' | 'sr_legacy_food';
}

export interface UsdaMatch<T extends UsdaCandidate> {
  candidate: T;
  /** 0–1; wartości od ~0.75 uznajemy za pewne dopasowanie. */
  score: number;
  coverage: number;
}

const STOPWORDS = new Set(['and', 'with', 'or', 'of', 'the', 'in', 'a', 'without', 'no', 'not']);

/** Słowa opisujące stan produktu; zgodność tego stanu z zapytaniem jest warunkiem dopasowania. */
const STATE_WORDS = new Set([
  'raw', 'cooked', 'boiled', 'fried', 'roasted', 'baked', 'grilled', 'broiled', 'steamed', 'stewed', 'braised',
  'dry', 'dried', 'canned', 'frozen', 'smoked', 'pickled', 'toasted', 'microwaved', 'sauteed', 'scrambled', 'poached',
]);

const singular = (word: string) => (word.length > 3 && word.endsWith('s') && !word.endsWith('ss') ? word.slice(0, -1) : word);

export function tokenize(text: string): string[] {
  return text.toLowerCase().replace(/[^a-z0-9%\s,-]/g, ' ').split(/[\s,-]+/)
    .map(singular).filter((token) => token && !STOPWORDS.has(token));
}

const headOf = (text: string) => tokenize(text.split(',')[0]);

/** Ocena jednego kandydata względem angielskiej nazwy zapytania; null = odrzucony (inny rodzaj albo sprzeczny stan). */
export function scoreUsdaCandidate(queryEn: string, description: string): { score: number; coverage: number } | null {
  const queryTokens = tokenize(queryEn);
  if (!queryTokens.length) return null;
  const descTokens = tokenize(description);
  const descSet = new Set(descTokens);

  const queryHead = headOf(queryEn);
  const descHead = headOf(description);
  // Rodzaj musi się zgadzać: wszystkie słowa głowy zapytania są w głowie opisu.
  if (!queryHead.length || !queryHead.every((token) => descHead.includes(token))) return null;

  const queryStates = queryTokens.filter((token) => STATE_WORDS.has(token));
  const descStates = descTokens.filter((token) => STATE_WORDS.has(token));
  // Stan z zapytania musi występować w opisie.
  if (queryStates.some((state) => !descSet.has(state))) return null;
  // Opis z innym stanem, którego zapytanie nie wskazuje (np. zapytanie bez stanu, opis „raw”) dostaje karę, nie odrzucenie.
  const unrequestedStates = descStates.filter((state) => !queryStates.includes(state)).length;

  const rest = queryTokens.filter((token) => !queryHead.includes(token));
  const coverage = rest.length ? rest.filter((token) => descSet.has(token)).length / rest.length : 1;
  if (coverage < 0.6) return null;

  const extra = descTokens.filter((token) => !queryTokens.includes(token) && !STATE_WORDS.has(token)).length;
  const score = 0.55 + 0.35 * coverage - Math.min(0.25, extra * 0.025) - Math.min(0.2, unrequestedStates * 0.1);
  return { score: Math.round(Math.max(0, Math.min(1, score)) * 1000) / 1000, coverage: Math.round(coverage * 100) / 100 };
}

/** Najlepszy kandydat albo null; przy remisie wygrywa Foundation, potem krótszy opis. */
export function pickUsdaMatch<T extends UsdaCandidate>(queryEn: string, candidates: T[], minScore = 0.7): UsdaMatch<T> | null {
  const scored = candidates.flatMap((candidate): UsdaMatch<T>[] => {
    const result = scoreUsdaCandidate(queryEn, candidate.description);
    return result ? [{ candidate, ...result }] : [];
  });
  scored.sort((a, b) => b.score - a.score
    || Number(b.candidate.dataType === 'foundation_food') - Number(a.candidate.dataType === 'foundation_food')
    || a.candidate.description.length - b.candidate.description.length);
  const best = scored[0];
  return best && best.score >= minScore ? best : null;
}
