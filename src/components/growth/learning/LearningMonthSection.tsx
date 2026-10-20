import { Plus } from 'lucide-react';
import { MAX_ACTIVE_PER_MONTH, type LearningAssignment } from '../../../lib/learning/learningModel';
import DataStateNotice from '../../core/DataStateNotice';
import Button from '../../ui/Button';
import Skeleton from '../../ui/Skeleton';
import LearningAssignmentCard from './LearningAssignmentCard';

const MONTH_NAMES = [
  'styczeń', 'luty', 'marzec', 'kwiecień', 'maj', 'czerwiec',
  'lipiec', 'sierpień', 'wrzesień', 'październik', 'listopad', 'grudzień',
];

interface LearningMonthSectionProps {
  monthStart: string;
  today: string;
  assignments: LearningAssignment[];
  loggedToday: Record<string, number>;
  skillLabels: Record<string, string>;
  loading: boolean;
  error: Error | null;
  busyId: string | null;
  onToggleToday: (assignment: LearningAssignment) => void;
  onDrop: (assignment: LearningAssignment) => void;
  onAdd: () => void;
}

export default function LearningMonthSection({
  monthStart,
  today,
  assignments,
  loggedToday,
  skillLabels,
  loading,
  error,
  busyId,
  onToggleToday,
  onDrop,
  onAdd,
}: LearningMonthSectionProps) {
  const monthName = MONTH_NAMES[Number(monthStart.slice(5, 7)) - 1] ?? '';
  const activeCount = assignments.filter((a) => a.status === 'active').length;
  const full = activeCount >= MAX_ACTIVE_PER_MONTH;

  return (
    <section className="space-y-3" aria-labelledby="learning-month-title">
      <div className="flex items-end justify-between gap-3">
        <div>
          <h2 id="learning-month-title" className="text-lg font-black tracking-tight text-text-primary">
            Ten miesiąc ({monthName})
          </h2>
          <p className="text-xs text-text-muted">
            Maksymalnie {MAX_ACTIVE_PER_MONTH} pozycje. Codziennie jeden slot i jedno kliknięcie.
          </p>
        </div>
        <Button onClick={onAdd} disabled={full} size="sm" icon={<Plus size={14} />} title={full ? 'Limit pozycji na miesiąc' : undefined}>
          Dodaj
        </Button>
      </div>

      {error && <DataStateNotice tone="warning" title="Nie udało się wczytać planu nauki" detail={error.message} />}

      {loading ? (
        <Skeleton className="h-40 w-full rounded-2xl" />
      ) : assignments.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border-custom/60 p-6 text-center space-y-3">
          <p className="text-sm font-bold text-text-primary">Nic nie jest zaplanowane na ten miesiąc.</p>
          <p className="text-xs text-text-muted">
            Wybierz książkę, kurs albo materiał z Pocketa. Aplikacja sama policzy, ile dziennie.
          </p>
          <Button onClick={onAdd} size="sm" icon={<Plus size={14} />}>Wybierz materiał</Button>
        </div>
      ) : (
        <ul className="space-y-3">
          {assignments.map((assignment) => (
            <LearningAssignmentCard
              key={assignment.id}
              assignment={assignment}
              skillLabel={assignment.skill_id ? skillLabels[assignment.skill_id] : null}
              today={today}
              loggedToday={loggedToday[assignment.id] ?? 0}
              busy={busyId === assignment.id}
              onToggleToday={() => onToggleToday(assignment)}
              onDrop={() => onDrop(assignment)}
            />
          ))}
        </ul>
      )}
    </section>
  );
}
