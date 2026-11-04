import { useExerciseVisual } from '../../../lib/health/exerciseImages';
import { useExerciseHistory } from '../workout/workoutUtils';
import LiveExerciseCardView, { type LiveExerciseCardProps } from './LiveExerciseCardView';

export default function LiveExerciseCard({ userId, ...props }: LiveExerciseCardProps) {
  const visual = useExerciseVisual(props.exercise.name);
  const { lastSession, allTimeBest1RM } = useExerciseHistory(props.exercise.name, userId);
  return <LiveExerciseCardView {...props} visual={visual} lastSession={lastSession} allTimeBest1RM={allTimeBest1RM} />;
}
