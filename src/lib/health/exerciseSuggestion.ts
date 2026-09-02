import type { ExerciseHistoryRow } from './workout';
import {
  computeWeightSuggestion,
  type ProgressionAction,
  type WeightSuggestion,
} from './progression';
import { PROGRESSION_RULES } from './progressionRules';

/** Ćwiczenia gdzie 0 kg = bodyweight, progresja po powtórzeniach lub belt. */
const BODYWEIGHT_PATTERN = /dip|dipy|pompki|pull-up|pull up|podci[aą]g|chin-up|muscle-up/i;

export function isBodyweightExercise(exerciseName: string): boolean {
  return BODYWEIGHT_PATTERN.test(exerciseName.trim());
}

export interface RepsSuggestion {
  lastReps: number;
  suggestedReps: number;
  action: ProgressionAction;
  reason: string;
}

export type ExerciseSuggestion =
  | { mode: 'weight'; weight: WeightSuggestion }
  | { mode: 'belt'; weight: WeightSuggestion }
  | { mode: 'reps'; reps: RepsSuggestion };

function bwWorkingSets(lastSession: ExerciseHistoryRow[]) {
  return lastSession.filter((s) => Number(s.reps) > 0 && Number(s.weight) === 0);
}

function weightedWorkingSets(lastSession: ExerciseHistoryRow[]) {
  return lastSession.filter((s) => Number(s.reps) > 0 && Number(s.weight) > 0);
}

export function computeRepsSuggestion(bwSets: ExerciseHistoryRow[]): RepsSuggestion | null {
  if (!bwSets.length) return null;

  const reps = bwSets.map((s) => Number(s.reps));
  const maxReps = Math.max(...reps);
  const topSets = bwSets.filter((s) => Number(s.reps) === maxReps);
  const minReps = Math.min(...topSets.map((s) => Number(s.reps)));
  const maxTop = Math.max(...topSets.map((s) => Number(s.reps)));
  const repsConsistent = maxTop - minReps <= 1;

  const rirValues = topSets.map((s) => s.rir).filter((r): r is number => r != null);
  const avgRir = rirValues.length
    ? rirValues.reduce((a, b) => a + b, 0) / rirValues.length
    : null;

  const resolve = (): { action: ProgressionAction; reason: string } => {
    if (avgRir !== null && avgRir < 0.5) {
      return { action: 'regress', reason: 'Blisko failure — trzymaj lub −1 powt.' };
    }
    if (!repsConsistent) {
      return { action: 'hold', reason: 'Powtórzenia skaczą — najpierw wyrównaj serie BW' };
    }
    if (avgRir !== null && avgRir < PROGRESSION_RULES.targetRirMin) {
      return { action: 'hold', reason: `RIR ${avgRir.toFixed(1)} < cel ${PROGRESSION_RULES.targetRirMin}` };
    }
    return { action: 'progress', reason: 'Serie BW OK, RIR w normie → +1 powt.' };
  };

  const { action, reason } = resolve();

  let suggestedReps = maxReps;
  if (action === 'progress') suggestedReps = maxReps + 1;
  else if (action === 'regress') suggestedReps = Math.max(1, maxReps - 1);

  return { lastReps: maxReps, suggestedReps, action, reason };
}

export function computeExerciseSuggestion(
  lastSession: ExerciseHistoryRow[] | null | undefined,
  exerciseName = '',
  muscleTags: string[] = [],
): ExerciseSuggestion | null {
  if (!lastSession?.length) return null;

  const weighted = weightedWorkingSets(lastSession);
  const bw = bwWorkingSets(lastSession);
  const bwExercise = isBodyweightExercise(exerciseName);

  if (bwExercise && weighted.length > 0) {
    const weight = computeWeightSuggestion(lastSession, exerciseName, muscleTags);
    return weight ? { mode: 'belt', weight } : null;
  }

  if (bwExercise && bw.length > 0 && weighted.length === 0) {
    const reps = computeRepsSuggestion(bw);
    return reps ? { mode: 'reps', reps } : null;
  }

  const weight = computeWeightSuggestion(lastSession, exerciseName, muscleTags);
  return weight ? { mode: 'weight', weight } : null;
}

export function formatSuggestionShort(suggestion: ExerciseSuggestion): string {
  if (suggestion.mode === 'reps') {
    const { reps } = suggestion;
    const arrow = reps.action === 'progress' ? ' ↑' : reps.action === 'regress' ? ' ↓' : '';
    return `→ ${reps.suggestedReps} powt.${arrow}`;
  }
  const w = suggestion.weight;
  const arrow = w.action === 'progress' ? ' ↑' : w.action === 'regress' ? ' ↓' : '';
  const belt = suggestion.mode === 'belt' ? ' belt' : '';
  return `→ ${w.suggestedWeight}kg${belt}${arrow}`;
}

export function suggestionProgressed(suggestion: ExerciseSuggestion): boolean {
  if (suggestion.mode === 'reps') return suggestion.reps.action === 'progress';
  return suggestion.weight.action === 'progress';
}

export function suggestionRegressed(suggestion: ExerciseSuggestion): boolean {
  if (suggestion.mode === 'reps') return suggestion.reps.action === 'regress';
  return suggestion.weight.action === 'regress';
}

export function suggestionReason(suggestion: ExerciseSuggestion): string {
  if (suggestion.mode === 'reps') return suggestion.reps.reason;
  return suggestion.weight.reason;
}
