import Button from '../ui/Button';
import { History, Check } from 'lucide-react';

export default function WeekHubOverdueCue({
  closingOverdue,
  onQuickComplete,
  onStartWeeklyReview,
}: {
  closingOverdue: boolean;
  onQuickComplete: () => void;
  onStartWeeklyReview?: () => void;
}) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-2xl border border-warning/25 bg-warning/[0.06] p-3.5">
      <div className="min-w-0">
        <p className="flex items-center gap-1.5 text-2xs font-semibold text-warning">
          <History size={12} /> Poprzedni tydzień czeka na domknięcie
        </p>
        <p className="mt-0.5 text-xs text-text-secondary">
          Zamknij zaległość jednym kliknięciem, aby zachować czysty rytm tygodnia.
        </p>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <Button
          variant="outline"
          size="sm"
          type="button"
          onClick={onQuickComplete}
          disabled={closingOverdue}
          className="rounded-xl px-3 py-1.5 text-xs font-bold text-warning border-warning/30 hover:bg-warning/10"
        >
          <Check size={12} className="mr-1 inline" /> Zamknij tydzień
        </Button>
        {onStartWeeklyReview && (
          <Button
            variant="ghost"
            size="sm"
            type="button"
            onClick={onStartWeeklyReview}
            className="text-xs font-semibold text-text-muted hover:text-warning px-1.5 py-1 transition-colors"
          >
            Pełny review →
          </Button>
        )}
      </div>
    </div>
  );
}
