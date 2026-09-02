import type { ExerciseHistoryRow } from './workout';
import {
  classifyMovement,
  incrementKg,
  PROGRESSION_RULES,
  type MovementIncrement,
} from './progressionRules';

export type ProgressionAction = 'progress' | 'hold' | 'regress';

export interface WeightSuggestion {
  suggestedWeight: number;
  lastWeight: number;
  action: ProgressionAction;
  movement: MovementIncrement;
  reason: string;
}

function sessionSets(lastSession: ExerciseHistoryRow[]) {
  return lastSession.filter((s) => Number(s.weight) > 0 && Number(s.reps) > 0);
}

export function computeWeightSuggestion(
  lastSession: ExerciseHistoryRow[] | null | undefined,
  exerciseName = '',
  muscleTags: string[] = [],
): WeightSuggestion | null {
  if (!lastSession?.length) return null;

  const working = sessionSets(lastSession);
  if (!working.length) return null;

  const maxW = Math.max(...working.map((s) => Number(s.weight)));
  if (!maxW) return null;

  const topSets = working.filter((s) => Number(s.weight) === maxW);
  const reps = topSets.map((s) => Number(s.reps));
  const minReps = Math.min(...reps);
  const maxReps = Math.max(...reps);
  const repsConsistent = maxReps - minReps <= 1;

  const rirValues = topSets.map((s) => s.rir).filter((r): r is number => r != null);
  const avgRir = rirValues.length
    ? rirValues.reduce((a, b) => a + b, 0) / rirValues.length
    : null;

  const movement = classifyMovement(exerciseName, muscleTags);
  const step = incrementKg(movement);

  const resolve = (): { action: ProgressionAction; reason: string } => {
    if (avgRir !== null && avgRir < 0.5 && minReps <= Math.min(...reps)) {
      return { action: 'regress', reason: 'Blisko failure (RIR ~0) — rozważ lekki step w dół' };
    }
    if (!repsConsistent) {
      return { action: 'hold', reason: 'Powtórzenia skaczą między seriami — najpierw wyrównaj' };
    }
    if (avgRir !== null && avgRir < PROGRESSION_RULES.targetRirMin) {
      return { action: 'hold', reason: `RIR ${avgRir.toFixed(1)} < cel ${PROGRESSION_RULES.targetRirMin}` };
    }
    return { action: 'progress', reason: `Serie OK, RIR w normie → +${step} kg` };
  };

  const { action, reason } = resolve();

  let suggestedWeight = maxW;
  if (action === 'progress') suggestedWeight = maxW + step;
  else if (action === 'regress') suggestedWeight = Math.max(step, maxW - step);

  return {
    suggestedWeight,
    lastWeight: maxW,
    action,
    movement,
    reason,
  };
}
