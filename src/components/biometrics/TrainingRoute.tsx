import { useState, Suspense, lazy } from 'react';
import { useNavigate } from 'react-router-dom';
import type { WorkoutLoggerInitial } from '../../lib/health/workoutLogging';
import { isWorkoutSessionActive, markWorkoutSessionActive, endWorkoutSession } from '../../lib/health/workoutLogging';
import { useUserId } from '../../store/useStore';
import Spinner from '../ui/Spinner';

const WorkoutLogger = lazy(() => import('./WorkoutLogger'));
const TrainingHubView = lazy(() => import('./workout/TrainingHubView'));

interface TrainingRouteProps {
  initial?: WorkoutLoggerInitial | null;
  onSaved?: () => void;
  onBack?: () => void;
}

export default function TrainingRoute({ initial, onSaved, onBack }: TrainingRouteProps) {
  const userId = useUserId();
  const navigate = useNavigate();

  const [currentInitial, setCurrentInitial] = useState<WorkoutLoggerInitial | null | undefined>(initial);
  const [isLive, setIsLive] = useState<boolean>(() => {
    if (initial) return true;
    if (userId && isWorkoutSessionActive(userId)) return true;
    return false;
  });

  const [prevInitial, setPrevInitial] = useState(initial);
  if (initial !== prevInitial) {
    setPrevInitial(initial);
    if (initial) {
      setCurrentInitial(initial);
      setIsLive(true);
    }
  }

  const handleStartWorkout = (init?: WorkoutLoggerInitial | null) => {
    if (userId) markWorkoutSessionActive(userId);
    setCurrentInitial(init);
    setIsLive(true);
  };

  const handleLoggerBack = () => {
    setIsLive(false);
    setCurrentInitial(null);
  };

  const handleHubBack = () => {
    if (onBack) onBack();
    else navigate('/dzis');
  };

  const handleSaved = () => {
    if (userId) endWorkoutSession(userId);
    setIsLive(false);
    setCurrentInitial(null);
    onSaved?.();
  };

  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-background">
          <Spinner size="md" />
        </div>
      }
    >
      {isLive ? (
        <WorkoutLogger
          initial={currentInitial}
          onSaved={handleSaved}
          onBack={handleLoggerBack}
        />
      ) : (
        <TrainingHubView
          userId={userId}
          onStartWorkout={handleStartWorkout}
          onBack={handleHubBack}
          onNavigate={(path) => navigate(path)}
        />
      )}
    </Suspense>
  );
}
