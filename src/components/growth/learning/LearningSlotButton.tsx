import { Check, Undo2 } from 'lucide-react';
import { dailySlot, formatSlot, type LearningAssignment, type LearningUnit } from '../../../lib/learning/learningModel';
import Button from '../../ui/Button';

interface LearningSlotButtonProps {
  assignment: LearningAssignment;
  today: string;
  loggedToday: number;
  busy: boolean;
  onToggle: () => void;
}

/** Dzisiejszy slot jednej pozycji i jedno kliknięcie „zrobione” (ponowne kliknięcie cofa). */
export default function LearningSlotButton({ assignment, today, loggedToday, busy, onToggle }: LearningSlotButtonProps) {
  const unit = assignment.unit as LearningUnit;
  const slot = dailySlot(assignment, today, loggedToday);
  const doneToday = loggedToday > 0;

  if (assignment.status === 'done' && !doneToday) {
    return <p className="text-xs font-bold text-success">Skończone</p>;
  }
  if (slot.amount <= 0 && !doneToday) return null;

  return (
    <div className="flex items-center justify-between gap-3">
      <div className="min-w-0">
        <p className="text-2xs font-semibold text-text-muted">
          {slot.overdue ? 'Zaległość na dziś' : 'Dziś'}
        </p>
        <p className="text-sm font-bold text-text-primary truncate">
          {formatSlot(slot, unit)}
          <span className="font-semibold text-text-muted"> · ok. {slot.minutes} min</span>
        </p>
      </div>
      <Button
        onClick={onToggle}
        loading={busy}
        size="sm"
        variant={doneToday ? 'tonal' : 'primary'}
        icon={doneToday ? <Undo2 size={14} /> : <Check size={14} />}
        aria-label={doneToday ? 'Cofnij dzisiejszy postęp' : 'Zrobione na dziś'}
        aria-pressed={doneToday}
      >
        {doneToday ? 'Zrobione' : 'Zrobione?'}
      </Button>
    </div>
  );
}
