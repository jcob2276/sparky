import { useMemo } from 'react';
import { Award, Gauge, Info, Timer } from 'lucide-react';
import {
  predictRaceTimes,
  type RunningActivityInput,
  type RacePredictorResult,
} from '@vanguard/domain';

interface RacePredictorCardProps {
  activities: Array<{
    name?: string | null;
    distance?: number | null;
    moving_time?: number | null;
    start_date?: string | null;
    average_heartrate?: number | null;
    sport_type?: string | null;
    source?: string | null;
  }>;
}

const DISTANCE_LABELS: Record<string, string> = {
  '5k': '5 km',
  '10k': '10 km',
  'half_marathon': 'Półmaraton (21.1 km)',
};

export function RacePredictorCard({ activities }: RacePredictorCardProps) {
  const result: RacePredictorResult = useMemo(() => {
    const inputs: RunningActivityInput[] = activities
      .filter((a) => a.start_date && a.distance && a.moving_time)
      .map((a, idx) => ({
        id: `act_${idx}_${a.start_date}`,
        startDate: a.start_date!,
        distanceMeters: a.distance!,
        movingTimeSeconds: a.moving_time!,
        averageHeartRate: a.average_heartrate,
        sportType: a.sport_type,
      }));

    return predictRaceTimes(inputs, { goal10kSeconds: 2700, cutoffDays: 42 });
  }, [activities]);

  const target = result.targetGoal10k;

  return (
    <section className="rounded-2xl border border-white/5 bg-surface-1 p-4 space-y-4">
      <div className="flex items-center justify-between border-b border-white/5 pb-3">
        <div>
          <h3 className="flex items-center gap-2 text-base font-semibold text-text-primary">
            <Timer size={18} className="text-primary" />
            Prognoza wyników biegowych
          </h3>
          <p className="text-xs text-text-muted">
            Szacunki wydolnościowe na dystansach z Garmina przez Intervals.icu
          </p>
        </div>
        <span className="flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-0.5 text-2xs font-medium text-primary">
          <Gauge size={12} />
          {result.basisRunsCount} biegów w bazie
        </span>
      </div>

      {/* Target Goal KPI Highlight */}
      {target && (
        <div className={`rounded-xl border p-3 ${
          target.achieved
            ? 'border-success/30 bg-success/5'
            : 'border-white/5 bg-surface-2'
        }`}>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Award size={18} className={target.achieved ? 'text-success' : 'text-primary'} />
              <div>
                <p className="text-xs font-medium text-text-secondary">Cel główny: 10 km w 45:00</p>
                <p className="text-sm font-bold text-text-primary">
                  Tempo docelowe: {target.formattedTargetPace}
                </p>
              </div>
            </div>

            <div className="text-right">
              <span className={`inline-block rounded-md px-2 py-0.5 text-xs font-semibold ${
                target.achieved
                  ? 'bg-success/20 text-success'
                  : 'bg-primary/15 text-primary'
              }`}>
                {target.formattedGap}
              </span>
            </div>
          </div>
        </div>
      )}

      {result.state === 'insufficient_data' ? (
        <div className="rounded-xl border border-dashed border-white/10 p-4 text-center space-y-1">
          <p className="text-sm font-medium text-text-primary">Kalibracja modelu prognozy</p>
          <p className="text-xs text-text-muted max-w-md mx-auto">
            {result.applicabilityNote}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="grid gap-2 sm:grid-cols-3">
            {result.predictions.map((pred) => (
              <div
                key={pred.distanceName}
                className="rounded-xl border border-white/5 bg-surface-2 p-3 space-y-1.5"
              >
                <div className="flex items-center justify-between text-xs text-text-muted">
                  <span className="font-semibold text-text-primary">
                    {DISTANCE_LABELS[pred.distanceName] ?? pred.distanceName}
                  </span>
                  <span>{pred.formattedPace}</span>
                </div>
                <p className="text-xl font-bold tabular-nums text-text-primary">
                  {pred.formattedTime}
                </p>
                <div className="flex items-center justify-between text-3xs text-text-muted border-t border-white/5 pt-1">
                  <span>Szybki: {pred.formattedFastTime}</span>
                  <span>Wolny: {pred.formattedSlowTime}</span>
                </div>
              </div>
            ))}
          </div>

          {result.supportingRuns.length > 0 && (
            <div className="space-y-1.5 pt-1">
              <p className="text-xs font-semibold uppercase tracking-wider text-text-muted">
                Biegi bazowe (ostatnie 42 dni)
              </p>
              <div className="space-y-1">
                {result.supportingRuns.slice(0, 3).map((run) => (
                  <div
                    key={run.id}
                    className="flex items-center justify-between rounded-lg bg-surface-2/60 px-3 py-1.5 text-xs"
                  >
                    <span className="text-text-secondary">{run.date}</span>
                    <span className="tabular-nums font-medium text-text-primary">{run.distanceKm} km</span>
                    <span className="tabular-nums text-text-muted">{run.formattedPace}</span>
                    <span className="tabular-nums text-text-muted">{run.avgHr ? `${run.avgHr} bpm` : '—'}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      <div className="flex items-start gap-1.5 pt-1 text-2xs text-text-muted">
        <Info size={13} className="mt-0.5 shrink-0" />
        <p>
          Formuła Riegela z korektą dyspozycji. Model nie gwarantuje wyniku w konkretnym dniu — dyspozycja startowa zależy od temperatury, profilu trasy i regeneracji.
        </p>
      </div>
    </section>
  );
}
