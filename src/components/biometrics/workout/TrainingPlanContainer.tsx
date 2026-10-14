import { useTrainingPlan } from './useTrainingPlan';
import TrainingPlanPreview from './TrainingPlanPreview';
import Spinner from '../../ui/Spinner';
import type { WorkoutLoggerInitial } from '../../../lib/health/workoutDraft';
export default function TrainingPlanContainer({ userId, onStartWorkout }: { userId: string; onStartWorkout?: (initial: WorkoutLoggerInitial) => void }) {
  const state = useTrainingPlan(userId, onStartWorkout);
  if (state.loading) return <Spinner size="md" />;
  return <TrainingPlanPreview {...state} versions={state.data?.versions ?? []} sessions={state.data?.sessions ?? []} jobs={state.data?.jobs ?? []} />;
}
