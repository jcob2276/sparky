/**
 * @file openGymCatalog.ts
 * @role Encyklopedia 1,324 ćwiczeń z OpenGym wraz z automatycznym mapowaniem
 * na polskie tagi anatomiczne Sparky.
 */

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

/**
 * Szybkie wyszukiwanie w katalogu 1,324 ćwiczeń (lazy load JSON).
 */
export async function searchOpenGymCatalog(query: string, limit = 10): Promise<OpenGymExercise[]> {
  const norm = query.toLowerCase().trim();
  if (!norm) return [];

  const catalog = await loadOpenGymCatalog();
  const results: OpenGymExercise[] = [];
  for (const ex of catalog) {
    if (ex.name.toLowerCase().includes(norm) || ex.target.toLowerCase().includes(norm)) {
      results.push(ex);
      if (results.length >= limit) break;
    }
  }

  return results;
}

/**
 * Synchronous lookup if catalog was already preloaded into memory.
 */
export function searchOpenGymCatalogSync(query: string, limit = 10): OpenGymExercise[] {
  if (!catalogCache) return [];
  const norm = query.toLowerCase().trim();
  if (!norm) return [];

  const results: OpenGymExercise[] = [];
  for (const ex of catalogCache) {
    if (ex.name.toLowerCase().includes(norm) || ex.target.toLowerCase().includes(norm)) {
      results.push(ex);
      if (results.length >= limit) break;
    }
  }

  return results;
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
