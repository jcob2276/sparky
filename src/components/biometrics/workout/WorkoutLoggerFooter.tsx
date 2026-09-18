import { Save } from 'lucide-react';
import Button from '../../ui/Button';
import type { WorkoutExercise } from './workoutUtils';
import { computeSessionStats } from './workoutUtils';

interface WorkoutLoggerFooterProps {
  exercises: WorkoutExercise[];
  saving: boolean;
  onSave: () => void;
}

export default function WorkoutLoggerFooter({ exercises, saving, onSave }: WorkoutLoggerFooterProps) {
  const stats = computeSessionStats(exercises);

  return (
    <footer className="fixed bottom-0 left-0 right-0 p-4 bg-background/95 backdrop-blur-[var(--blur-sm)] border-t border-border-custom space-y-3 z-[var(--z-sticky)]">
      {(stats.tonnage > 0 || stats.bwReps > 0) && (
        <div className="flex justify-between items-center px-1 max-w-md mx-auto w-full">
          <span className="text-xs font-black uppercase tracking-widest text-text-muted">
            Suma ({stats.completedSets} serii):
          </span>
          <span className="text-sm font-black text-primary tracking-wide font-display tabular-nums">
            {stats.tonnage > 0 ? `${stats.tonnage.toLocaleString()} kg` : ''}
            {stats.tonnage > 0 && stats.bwReps > 0 ? ' · ' : ''}
            {stats.bwReps > 0 ? `${stats.bwReps} powt. BW` : ''}
          </span>
        </div>
      )}
      <div className="max-w-md mx-auto w-full">
        <Button
          variant="primary"
          size="lg"
          onClick={onSave}
          loading={saving}
          icon={!saving ? <Save size={15} /> : undefined}
          className="w-full !py-4 !rounded-2xl font-black uppercase tracking-widest text-xs"
        >
          {saving ? 'Zapisywanie...' : 'Zapisz'}
        </Button>
      </div>
    </footer>
  );
}
