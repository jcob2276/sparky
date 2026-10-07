import { useState } from 'react';
import { ControlSelect } from '../../ui/ControlPrimitives';
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
  const [weightStep, setWeightStep] = useState(2.5);
  return (
    <>
      <div className="flex items-center justify-between gap-2 pb-1">
        <span className="text-xs text-text-secondary">Zmiana ciężaru −/+</span>
        <label className="flex items-center gap-2 text-xs text-text-secondary">
          Skok
          <ControlSelect aria-label="Skok ciężaru" value={weightStep}
            onChange={event => setWeightStep(Number(event.target.value))}
            className="h-11 rounded-lg border border-border-custom bg-surface-solid px-2 text-base font-semibold text-text-primary">
            {[0.5, 1, 2.5, 5].map(step => <option key={step} value={step}>{String(step).replace('.', ',')} kg</option>)}
          </ControlSelect>
        </label>
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
          isTimed={exercise.mode === 'timed'}
          weightStep={weightStep}
        />
      ))}
      <p className="text-xs text-text-secondary">Zapas (RIR) = ile powtórzeń zostało w rezerwie.</p>
    </>
  );
}
