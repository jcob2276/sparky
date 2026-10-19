/**
 * @file openGymCatalog.ts
 * @role Encyklopedia 1,324 ćwiczeń z OpenGym wraz z automatycznym mapowaniem
 * na polskie tagi anatomiczne Sparky.
 */

import {
  exerciseMatchesQuery,
  scoreExerciseMatch,
} from '../lib/health/exerciseSearch';

export interface OpenGymExercise {
  id: string;
  name: string;
  bodyPart: string;
  equipment: string;
  target: string;
  secondaries: string[];
  instructions?: string[];
}

let catalogCache: OpenGymExercise[] | null = null;
let catalogPromise: Promise<OpenGymExercise[]> | null = null;

export async function loadOpenGymCatalog(): Promise<OpenGymExercise[]> {
  if (catalogCache) return catalogCache;
  if (!catalogPromise) {
    catalogPromise = import('./openGymExercises.json').then((mod) => {
      catalogCache = (mod.default ?? mod) as OpenGymExercise[];
      return catalogCache;
    });
  }
  return catalogPromise;
}

export function preloadOpenGymCatalog(): void {
  void loadOpenGymCatalog();
}

/**
 * Mapowanie nazw mięśni z OpenGym (angielskie) na tagi Sparky (polskie).
 */
const TARGET_TO_TAG_MAP: Record<string, string[]> = {
  pectorals: ['klatka'],
  chest: ['klatka'],
  lats: ['plecy'],
  'upper back': ['plecy'],
  rhomboids: ['plecy'],
  spine: ['plecy'],
  delts: ['barki'],
  shoulders: ['barki'],
  biceps: ['biceps'],
  triceps: ['triceps'],
  forearms: ['przedramiona'],
  abs: ['brzuch'],
  core: ['brzuch'],
  quads: ['czworogłowe'],
  quadriceps: ['czworogłowe'],
  hamstrings: ['dwugłowe ud'],
  glutes: ['pośladki'],
  calves: ['łydki'],
  traps: ['plecy', 'barki'],
  trapezius: ['plecy', 'barki'],
};

/**
 * Przekształca cel mięśniowy i mięśnie pomocnicze na tagi Sparky.
 */
export function mapTargetToSparkyTags(target: string, secondaries: string[] = []): string[] {
  const set = new Set<string>();

  const primaryTags = TARGET_TO_TAG_MAP[target.toLowerCase()];
  if (primaryTags) {
    primaryTags.forEach((t) => set.add(t));
  }

  for (const s of secondaries) {
    const secTags = TARGET_TO_TAG_MAP[s.toLowerCase()];
    if (secTags) {
      secTags.forEach((t) => set.add(t));
    }
  }

  return Array.from(set);
}

export const mapTargetToVanguardTags = mapTargetToSparkyTags;

function rankCatalogHits(catalog: OpenGymExercise[], query: string, limit: number): OpenGymExercise[] {
  const q = query.trim();
  if (!q) return [];

  const scored: { ex: OpenGymExercise; score: number }[] = [];
  for (const ex of catalog) {
    const byName = exerciseMatchesQuery(ex.name, q);
    const byTarget = ex.target.toLowerCase().includes(q.toLowerCase());
    if (!byName && !byTarget) continue;
    const score = byName
      ? scoreExerciseMatch(ex.name, q)
      : scoreExerciseMatch(ex.target, q) - 200;
    scored.push({ ex, score });
  }
  scored.sort((a, b) => b.score - a.score || a.ex.name.localeCompare(b.ex.name));
  return scored.slice(0, limit).map((s) => s.ex);
}

/**
 * Wyszukiwanie w katalogu 1,324 ćwiczeń — ranking (nie pierwsze N alfabetycznie).
 */
export async function searchOpenGymCatalog(query: string, limit = 10): Promise<OpenGymExercise[]> {
  const catalog = await loadOpenGymCatalog();
  return rankCatalogHits(catalog, query, limit);
}

/**
 * Synchronous lookup if catalog was already preloaded into memory.
 */
export function searchOpenGymCatalogSync(query: string, limit = 10): OpenGymExercise[] {
  if (!catalogCache) return [];
  return rankCatalogHits(catalogCache, query, limit);
}

/**
 * Pobiera ćwiczenie po ID.
 */
export async function findExerciseById(id: string): Promise<OpenGymExercise | undefined> {
  const catalog = await loadOpenGymCatalog();
  return catalog.find((e) => e.id === id);
}

/**
 * Łączna liczba ćwiczeń w bazie.
 */
export async function getCatalogTotalCount(): Promise<number> {
  const catalog = await loadOpenGymCatalog();
  return catalog.length;
}
