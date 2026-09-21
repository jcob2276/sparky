import { useState, Suspense, lazy } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import type { WorkoutLoggerInitial } from '../../lib/health/workoutLogging';
import { markWorkoutSessionActive, endWorkoutSession } from '../../lib/health/workoutLogging';
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
  const [params] = useSearchParams();
  const isDirectLive = params.get('live') === '1' || params.get('nowy') === '1' || Boolean(initial);

  const [currentInitial, setCurrentInitial] = useState<WorkoutLoggerInitial | null | undefined>(initial);
  const [isLive, setIsLive] = useState<boolean>(isDirectLive);

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
    if (onSaved) onSaved();
    else navigate('/dzis');
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
