import type { WorkoutLoggerInitial } from '../../../lib/health/workoutLogging';
import TrainingPlanContainer from './TrainingPlanContainer';
import HealthGoalEditorContainer from './HealthGoalEditorContainer';

interface Props {
  userId: string;
  onStartWorkout?: (initial: WorkoutLoggerInitial) => void;
}

/** Plan od trenera i cele treningowe — zwinięte na dole Centrum, żeby nie przeszkadzały w szybkim starcie. */
export default function TrainingHubPlanSection({ userId, onStartWorkout }: Props) {
  const summary = 'cursor-pointer text-sm font-semibold text-text-primary';
  return (
    <div className="space-y-2.5">
      <details className="trening-panel rounded-[var(--tren-radius-card)] p-3.5">
        <summary className={summary}>Plan treningowy</summary>
        <div className="pt-3">
          <TrainingPlanContainer userId={userId} onStartWorkout={onStartWorkout} />
        </div>
      </details>
      <details className="trening-panel rounded-[var(--tren-radius-card)] p-3.5">
        <summary className={summary}>Cele i warunki treningu</summary>
        <div className="pt-3">
          <HealthGoalEditorContainer userId={userId} />
        </div>
      </details>
    </div>
  );
}
