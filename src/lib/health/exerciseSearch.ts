/**
 * PL/EN exercise search: alias expansion, token match, ranking.
 * OpenGym alphabetical order put "Band bench press" above "Barbell…" — score fixes that.
 */
import { normalize } from '../../data/exercises';
import {
  canonicalExerciseName,
  historyNamesFor,
} from './exerciseHistoryAliases';

function normalizeExerciseQuery(s: string): string {
  return normalize(s)
    .replace(/[-_/]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function aliasKeys(query: string): string[] {
  return historyNamesFor(query).map(normalizeExerciseQuery).filter(Boolean);
}

/** Whether catalog `name` should appear for free-text `query` (PL or EN). */
export function exerciseMatchesQuery(name: string, query: string): boolean {
  const q = normalizeExerciseQuery(query);
  if (!q) return true;
  const n = normalizeExerciseQuery(name);
  if (n.includes(q)) return true;

  const tokens = q.split(' ').filter((t) => t.length >= 2);
  if (tokens.length > 1 && tokens.every((t) => n.includes(t))) return true;

  const qAliases = aliasKeys(query);
  if (qAliases.some((a) => a === n)) return true;

  const nAliases = aliasKeys(name);
  if (nAliases.some((a) => a === q)) return true;

  // Query alias phrase appears inside OpenGym English name (e.g. bench press ⊂ barbell bench press)
  // only when the alias is the EN/PL synonym side, not the long Polish canonical alone.
  for (const a of qAliases) {
    if (a.length >= 4 && a !== n && n.includes(a)) return true;
  }
  return false;
}

/**
 * Higher = better. Prefer canonical/alias hits and default equipment (barbell)
 * when the user did not specify band/dumbbell/etc.
 */
export function scoreExerciseMatch(name: string, query: string): number {
  const q = normalizeExerciseQuery(query);
  const n = normalizeExerciseQuery(name);
  if (!q) return 0;

  let score = 0;
  const qAliases = aliasKeys(query);

  if (n === q || qAliases.includes(n)) score += 1000;
  else if (n.startsWith(q)) score += 720;
  else if (n.includes(q)) score += 480;

  const tokens = q.split(' ').filter((t) => t.length >= 2);
  if (tokens.length > 1 && tokens.every((t) => n.includes(t))) score += 220;

  const qHasEquip = /\b(band|dumbbell|hant|cable|smith|machine|guma|wyciag|kettle|trap bar)\b/.test(q);
  if (!qHasEquip) {
    if (/\bbarbell\b/.test(n) || /\bsztang/.test(n)) score += 90;
    if (/\bband\b/.test(n) || /\bguma\b/.test(n)) score -= 55;
    if (/\bdumbbell\b/.test(n) || /\bhantl/.test(n)) score += 25;
  }

  // Bare "bench press" / "wyciskanie" → flat barbell before incline/decline variants
  const bareBench =
    q === 'bench press' ||
    q === 'wyciskanie' ||
    q === 'wyciskanie plaskie' ||
    qAliases.includes('bench press');
  if (bareBench && /\b(incline|decline|close.?grip|guillotine|jm |floor )\b/.test(n)) {
    score -= 130;
  }

  score -= Math.min(n.length, 50);
  return score;
}

/** Hide "Własna nazwa" when query already resolves to a known movement. */
export function queryResolvesToCatalog(query: string, matchNames: string[]): boolean {
  const q = normalizeExerciseQuery(query);
  if (!q || matchNames.length === 0) return false;
  if (matchNames.some((m) => normalizeExerciseQuery(m) === q)) return true;

  const qAliases = aliasKeys(query);
  if (qAliases.length > 1) {
    const hit = matchNames.some((m) => qAliases.includes(normalizeExerciseQuery(m)));
    if (hit) return true;
  }

  const best = Math.max(...matchNames.map((m) => scoreExerciseMatch(m, query)));
  return best >= 480;
}

/** Collapse exact EN/PL aliases to the Sparky canonical name (history SSOT). */
export function resolveExercisePickName(name: string): string {
  return canonicalExerciseName(name.trim());
}
