import { useEffect, useMemo, useState } from 'react';
import { EXERCISES } from '../../../data/exercises';
import {
  mapTargetToSparkyTags,
  preloadOpenGymCatalog,
  searchOpenGymCatalog,
  type OpenGymExercise,
} from '../../../data/openGymCatalog';
import { formatEquipmentLabel } from '../../../lib/health/exerciseImages';
import {
  exerciseMatchesQuery,
  queryResolvesToCatalog,
  resolveExercisePickName,
  scoreExerciseMatch,
} from '../../../lib/health/exerciseSearch';

export interface ExerciseMatch {
  name: string;
  tags: string[];
  source: 'standard' | 'opengym';
  equipment?: string;
}

const STANDARD_LIMIT = 24;
const OPENGYM_LIMIT = 20;

function toTitle(name: string): string {
  return name.charAt(0).toUpperCase() + name.slice(1);
}

function filterStandard(query: string): ExerciseMatch[] {
  const q = query.trim();
  const pool = q
    ? EXERCISES.filter((e) => exerciseMatchesQuery(e.name, q))
    : EXERCISES;
  const ranked = [...pool].sort(
    (a, b) => scoreExerciseMatch(b.name, q) - scoreExerciseMatch(a.name, q),
  );
  return ranked.slice(0, STANDARD_LIMIT).map((e) => ({
    name: e.name,
    tags: e.tags,
    source: 'standard' as const,
  }));
}

export function useExerciseSearch(query: string, enabled: boolean) {
  const queryTrim = query.trim();
  const standardMatches = useMemo(() => filterStandard(queryTrim), [queryTrim]);

  const [rawOpenGym, setRawOpenGym] = useState<{ query: string; matches: ExerciseMatch[] }>({
    query: '',
    matches: [],
  });

  const shouldFetchOpenGym = enabled && queryTrim.length >= 2 && standardMatches.length < STANDARD_LIMIT;

  useEffect(() => {
    if (!enabled) return;
    preloadOpenGymCatalog();
  }, [enabled]);

  useEffect(() => {
    if (!shouldFetchOpenGym) return;
    let active = true;
    void searchOpenGymCatalog(queryTrim, OPENGYM_LIMIT)
      .then((results) => {
        if (!active) return;
        const matches: ExerciseMatch[] = results
          .filter(
            (og: OpenGymExercise) =>
              !standardMatches.some(
                (sm) =>
                  sm.name.toLowerCase() === og.name.toLowerCase() ||
                  resolveExercisePickName(og.name) === sm.name,
              ),
          )
          .map((og) => {
            const resolved = resolveExercisePickName(toTitle(og.name));
            const standard = EXERCISES.find((e) => e.name === resolved);
            return {
              name: standard?.name ?? toTitle(og.name),
              tags: standard?.tags ?? mapTargetToSparkyTags(og.target, og.secondaries),
              source: (standard ? 'standard' : 'opengym') as 'standard' | 'opengym',
              equipment: formatEquipmentLabel(og.equipment) ?? undefined,
            };
          });
        setRawOpenGym({ query: queryTrim, matches });
      })
      .catch(() => {
        if (active) setRawOpenGym({ query: queryTrim, matches: [] });
      });
    return () => {
      active = false;
    };
  }, [queryTrim, standardMatches, shouldFetchOpenGym]);

  const loadingOpenGym = shouldFetchOpenGym && rawOpenGym.query !== queryTrim;
  const openGymMatches = useMemo(
    () => (shouldFetchOpenGym && rawOpenGym.query === queryTrim ? rawOpenGym.matches : []),
    [shouldFetchOpenGym, rawOpenGym, queryTrim],
  );

  const matches = useMemo(() => {
    const merged = [...standardMatches, ...openGymMatches];
    const seen = new Set<string>();
    const deduped: ExerciseMatch[] = [];
    for (const m of merged) {
      const key = m.name.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      deduped.push(m);
    }
    return deduped.sort(
      (a, b) => scoreExerciseMatch(b.name, queryTrim) - scoreExerciseMatch(a.name, queryTrim),
    );
  }, [standardMatches, openGymMatches, queryTrim]);

  const canUseCustom =
    queryTrim.length >= 2 && !queryResolvesToCatalog(queryTrim, matches.map((m) => m.name));

  return {
    matches,
    loading: loadingOpenGym,
    canUseCustom,
    queryTrim,
  };
}
