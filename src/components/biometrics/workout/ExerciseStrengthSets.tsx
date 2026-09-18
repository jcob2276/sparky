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
  onOpenPlateCalc?: (initialKg: number, onApply: (kg: number) => void) => void;
}

export default function ExerciseStrengthSets({
  exercise,
  haptics,
  allTimeBest1RM,
  lastSessionRows,
  onFillSet,
  updateSet,
  removeSet,
  onOpenPlateCalc,
}: ExerciseStrengthSetsProps) {
  return (
    <>
      <div className="grid grid-cols-[24px_minmax(64px,74px)_minmax(60px,1fr)_minmax(54px,1fr)_minmax(46px,1fr)_24px] gap-1.5 px-0.5 mb-0.5">
        <span className="text-3xs font-black uppercase text-text-muted/60 text-center">#</span>
        <span className="text-3xs font-black uppercase tracking-wider text-text-muted text-center truncate">
          Ostatnio
        </span>
        <span className="text-3xs font-black uppercase tracking-wider text-text-muted text-center">
          KG
        </span>
        <span className="text-3xs font-black uppercase tracking-wider text-text-muted text-center">
          Pow.
        </span>
        <span className="text-3xs font-black uppercase tracking-wider text-text-muted text-center">
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
          onOpenPlateCalc={onOpenPlateCalc}
        />
      ))}
    </>
  );
}
