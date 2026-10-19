import { CheckCircle2 } from 'lucide-react';

interface PowerListProgressProps {
  done: number;
  total: number;
  closed: boolean;
}

/** 5 segmentów postępu (płynne wypełnienie transformem) + licznik x/5. */
export default function PowerListProgress({ done, total, closed }: PowerListProgressProps) {
  const won = total > 0 && done >= total;
  return (
    <div className="flex items-center gap-2" role="img" aria-label={`Ukończono ${done} z ${total}`}>
      {won && (
        <span className="flex items-center gap-1 text-xs font-semibold text-dayC wins-won-in">
          {closed && <CheckCircle2 size={13} aria-hidden />}
          Dzień wygrany
        </span>
      )}
      <span className="flex gap-1" aria-hidden>
        {Array.from({ length: total }).map((_, i) => (
          <span key={i} className="h-1.5 w-4 overflow-hidden rounded-full bg-border-custom">
            <span data-on={i < done} className="wins-seg-fill block h-full w-full rounded-full bg-dayC" />
          </span>
        ))}
      </span>
      <span className={`font-display text-xs font-bold tabular-nums ${won ? 'text-dayC' : 'text-text-muted'}`}>
        {done}/{total}
      </span>
    </div>
  );
}
