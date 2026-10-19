import type { ExerciseHistoryRow } from './workout';
import type { WorkoutSet } from './workout';
import { newSet } from './workout';

export function formatHistorySetLabel(row: ExerciseHistoryRow): string {
  const w = Number(row.weight) || 0;
  const weight = w === 0 ? 'BW' : `${w} kg`;
  const rir = row.rir != null ? ` @${row.rir}` : '';
  return `${weight}×${row.reps}${rir}`;
}

function fillSetFromHistory(set: WorkoutSet, row: ExerciseHistoryRow): WorkoutSet {
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
