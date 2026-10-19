import { useState } from 'react';
import { shiftDateStr } from '../../../lib/date';
import { OuraDayNightChart } from './OuraDayNightChart';
import { OuraIntakeSection } from './OuraIntakeSection';
import { useDayNightTimeline } from './hooks/useDayNightTimeline';
import type { OuraHealthHubData } from './types';

interface OuraDayNightSectionProps {
  data: OuraHealthHubData;
  /** Latest night with measurements (wake-up date, YYYY-MM-DD). */
  latestNight: string;
}

/** "Dzień → noc": one shared time axis for caffeine, supplements, meals, training and the night, plus the intake summary. */
export function OuraDayNightSection({ data, latestNight }: OuraDayNightSectionProps) {
  const userId = data.userId ?? '';
  const [nightDate, setNightDate] = useState(latestNight);
  const query = useDayNightTimeline(userId, nightDate);
  const sourceErrors = query.data?.sourceErrors ?? [];
  const error = query.error instanceof Error ? query.error.message : null;

  return (
    <section className="space-y-4" aria-labelledby="day-night-title">
      <div>
        <h2 id="day-night-title" className="text-2xl font-light">Dzień i noc na jednej osi</h2>
        <p className="mt-2 text-sm leading-6 text-text-secondary">
          Kawa, suplementy, posiłki i trening nałożone na fazy snu, tętno i HRV. Przesuń palcem lub myszą po wykresie, żeby zobaczyć, co działo się o danej godzinie.
        </p>
      </div>
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
      <OuraIntakeSection userId={userId} data={data} />
    </section>
  );
}
