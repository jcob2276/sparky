import { WorkoutExercise } from './workoutUtils';
import type { ExerciseHistoryRow } from '../../../lib/health/workout';
import { StrengthSetRow } from './StrengthSetRow';

interface ExerciseStrengthSetsProps {
  exercise: WorkoutExercise;
  haptics: { light: () => void };
  allTimeBest1RM: number | null | undefined;
  lastSessionRows: ExerciseHistoryRow[];
  onFillSet: (setId: number, row: ExerciseHistoryRow) => void;
  updateSet: (id: number, field: string, value: string | boolean) => void;
  removeSet: (id: number) => void;
}

export default function ExerciseStrengthSets({
  exercise,
  haptics,
  allTimeBest1RM,
  lastSessionRows,
  onFillSet,
  updateSet,
  removeSet,
}: ExerciseStrengthSetsProps) {
  return (
    <>
      <div className="grid grid-cols-[var(--ds-arbitrary-28px-1fr-1fr-1fr-60px)] gap-2 px-0.5">
        <span />
        <span className="text-2xs font-black uppercase tracking-widest text-text-muted text-center">
          KG
        </span>
        <span className="text-2xs font-black uppercase tracking-widest text-text-muted text-center">
          Pow.
        </span>
        <span className="text-2xs font-black uppercase tracking-widest text-text-muted text-center">
          RIR
        </span>
        <span />
      </div>
      {exercise.sets.map((set, idx) => (
        <StrengthSetRow
          key={set.id}
          set={set}
          idx={idx}
          historyRow={lastSessionRows[idx]}
          allTimeBest1RM={allTimeBest1RM}
          haptics={haptics}
          onFillSet={onFillSet}
          updateSet={updateSet}
          removeSet={removeSet}
        />
      ))}
    </>
  );
}
