import { useEffect } from 'react';
import { useLocation, useSearchParams } from 'react-router-dom';
import ExerciseProgressPage from './ExerciseProgressPage';

type ProgressNavState = { exerciseName?: string };

export default function ExerciseProgressRoute({ onBack }: { onBack: () => void }) {
  const [params] = useSearchParams();
  const location = useLocation();
  const stateName = (location.state as ProgressNavState | null)?.exerciseName?.trim() ?? '';
  const queryName = params.get('n')?.trim() ?? '';
  const name = queryName || stateName;

  useEffect(() => {
    if (!name) onBack();
  }, [name, onBack]);

  if (!name) return null;

  return <ExerciseProgressPage exerciseName={name} onBack={onBack} />;
}
