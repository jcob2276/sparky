import type { ExerciseHistoryRow } from './workout';
import type { WorkoutSet } from './workout';
import { newSet } from './workout';
import type { ExerciseSuggestion } from './exerciseSuggestion';

export function isSetEmpty(set: WorkoutSet): boolean {
  return !set.kg.trim() && !set.reps.trim();
}

export function formatHistorySetLabel(row: ExerciseHistoryRow): string {
  const w = Number(row.weight) || 0;
  const weight = w === 0 ? 'BW' : `${w} kg`;
  const rir = row.rir != null ? ` @${row.rir}` : '';
  return `${weight}×${row.reps}${rir}`;
}

export function fillSetFromHistory(set: WorkoutSet, row: ExerciseHistoryRow): WorkoutSet {
  return {
    ...set,
    kg: row.weight != null ? String(row.weight) : '',
    reps: row.reps != null ? String(row.reps) : '',
    rir: row.rir != null ? String(row.rir) : '',
  };
}

export function sortedHistorySets(rows: ExerciseHistoryRow[]): ExerciseHistoryRow[] {
  return [...rows].sort((a, b) => (a.set_number ?? 0) - (b.set_number ?? 0));
}

export function fillAllSetsFromHistory(
  sets: WorkoutSet[],
  lastSession: ExerciseHistoryRow[],
): WorkoutSet[] {
  const history = sortedHistorySets(lastSession);
  if (!history.length) return sets;

  const targetLen = Math.max(sets.length, history.length);
  const base = [...sets];
  while (base.length < targetLen) {
    base.push(newSet());
  }

  return base.map((set, i) => {
    const row = history[i];
    return row ? fillSetFromHistory(set, row) : set;
  });
}

export function applySuggestionToSets(
  sets: WorkoutSet[],
  lastSession: ExerciseHistoryRow[],
  suggestion: ExerciseSuggestion,
): WorkoutSet[] {
  const filled = fillAllSetsFromHistory(sets, lastSession);

  if (suggestion.mode === 'weight' || suggestion.mode === 'belt') {
    const { suggestedWeight, lastWeight } = suggestion.weight;
    if (suggestedWeight === lastWeight) return filled;
    return filled.map((set) => {
      const kg = parseFloat(set.kg);
      if (!Number.isNaN(kg) && kg === lastWeight) {
        return { ...set, kg: String(suggestedWeight) };
      }
      return set;
    });
  }

  const { suggestedReps, lastReps } = suggestion.reps;
  if (suggestedReps === lastReps) return filled;
  return filled.map((set) => {
    const kg = parseFloat(set.kg);
    const reps = parseInt(set.reps, 10);
    if ((Number.isNaN(kg) || kg === 0) && reps === lastReps) {
      return { ...set, kg: '0', reps: String(suggestedReps) };
    }
    return set;
  });
}
