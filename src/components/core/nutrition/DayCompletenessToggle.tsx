import Button from '../../ui/Button';
import type { DayReview } from './hooks/useDayReview';

const OPTIONS = [
  { value: 'complete', label: 'Dzień pełny', hint: 'Zapisałem wszystko, co zjadłem (także gdy to post).' },
  { value: 'partial', label: 'Brakuje wpisów', hint: 'Część jedzenia nie jest zapisana; dzień nie wchodzi do kalibracji.' },
] as const;

/** Jedno dotknięcie mówi systemowi, czy dzień jest kompletny; ponowne dotknięcie cofa decyzję. */
export default function DayCompletenessToggle({ review }: { review: DayReview }) {
  return (
    <div className="flex items-center justify-between gap-2" role="group" aria-label="Kompletność dnia">
      <span className="text-2xs font-semibold tracking-wide text-text-muted">Dziennik tego dnia</span>
      <div className="flex gap-1">
        {OPTIONS.map(({ value, label, hint }) => {
          const active = review.status === value;
          return (
            <Button
              key={value}
              size="sm"
              variant={active ? 'tonal' : 'ghost'}
              title={hint}
              aria-pressed={active}
              disabled={review.saving}
              onClick={() => review.setStatus(active ? 'unknown' : value)}
            >
              {label}
            </Button>
          );
        })}
      </div>
    </div>
  );
}
