import { useState } from 'react';
import { shiftDateStr } from '../../../lib/date';
import { OuraDayNightChart } from './OuraDayNightChart';
import { useDayNightTimeline } from './hooks/useDayNightTimeline';

interface OuraDayNightSectionProps {
  userId: string;
  /** Latest night with measurements (wake-up date, YYYY-MM-DD). */
  latestNight: string;
}

/** "Dzień → noc": one shared time axis for caffeine, meals, training and the night. Context facts live in the "Co poprzedzało tę noc" strip. */
export function OuraDayNightSection({ userId, latestNight }: OuraDayNightSectionProps) {
  const [nightDate, setNightDate] = useState(latestNight);
  const query = useDayNightTimeline(userId, nightDate);
  const sourceErrors = query.data?.sourceErrors ?? [];
  const error = query.error instanceof Error ? query.error.message : null;

  return (
    <div className="space-y-3">
      <OuraDayNightChart
        timeline={query.data?.timeline ?? null}
        loading={query.isLoading}
        error={error}
        onPrevNight={() => setNightDate((d) => shiftDateStr(d, -1))}
        onNextNight={nightDate < latestNight ? () => setNightDate((d) => shiftDateStr(d, 1)) : undefined}
      />
      {sourceErrors.length > 0 && (
        <p className="text-xs leading-5 text-text-muted">
          Nie wczytano części warstw: {sourceErrors.map((e) => e.source).join(', ')}. Wykres pokazuje to, co się udało pobrać.
        </p>
      )}
    </div>
  );
}
