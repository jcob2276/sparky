import Button from '../ui/Button';
import type { GoalStatus } from '../../lib/goal/reviewCycle.data';

const OPTIONS: ReadonlyArray<{ status: GoalStatus; label: string; variant: 'primary' | 'tonal' | 'danger' }> = [
  { status: 'done', label: '🟢 Dowiezione', variant: 'primary' },
  { status: 'partial', label: '🟡 Częściowo', variant: 'tonal' },
  { status: 'missed', label: '🔴 Spalone', variant: 'danger' },
];

export default function ReviewGoalStatus({
  value,
  onChange,
}: {
  value: GoalStatus | undefined;
  onChange: (status: GoalStatus) => void;
}) {
  return (
    <div className="flex items-center gap-1.5 border-t border-border-custom/30 pt-1 text-2xs">
      <span className="mr-1 text-2xs font-semibold text-text-muted">Jak poszło?</span>
      {OPTIONS.map(({ status, label, variant }) => (
        <Button
          key={status}
          size="sm"
          variant={value === status ? variant : 'secondary'}
          aria-pressed={value === status}
          onClick={() => onChange(status)}
          className="text-2xs"
        >
          {label}
        </Button>
      ))}
    </div>
  );
}
