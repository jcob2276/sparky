import type { OuraHealthHubData } from './types';
import {
  activityHeartRateZones,
  activitySourceLabel,
  summarizeStrengthProgression,
  type LiftConfig,
} from '@vanguard/domain';
import { formatWarsawDate } from '../../../lib/date';
import DataStateNotice from '../../core/DataStateNotice';
import { RacePredictorCard } from '../workout/RacePredictorCard';
import { CircularTargetStrainCard } from '../health/CircularTargetStrainCard';
import { MuscularCardioLoadCard } from '../health/MuscularCardioLoadCard';
import { Zone2WeeklyCard } from '../health/Zone2WeeklyCard';
import { StrengthProgressionCard } from '../health/StrengthProgressionCard';

function formatPace(movingSeconds: number, distanceMeters: number): string {
  if (!distanceMeters || distanceMeters <= 0) return '—';
  const totalKm = distanceMeters / 1000;
  const secPerKm = movingSeconds / totalKm;
  const m = Math.floor(secPerKm / 60);
  const s = Math.round(secPerKm % 60);
  return `${m}:${s < 10 ? '0' : ''}${s} /km`;
}

function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m ${s < 10 ? '0' : ''}${s}s`;
}

const DEFAULT_STRENGTH_LIFTS: LiftConfig[] = [
  {
    key: 'bench_press',
    name: 'Wyciskanie na ławce',
    target1RM: 110,
    history: [
      { date: '2026-10-01', weightKg: 85, reps: 6 },
      { date: '2026-10-08', weightKg: 90, reps: 5 },
    ],
  },
  {
    key: 'squat',
    name: 'Przysiad ze sztangą',
    target1RM: 140,
    history: [
      { date: '2026-10-02', weightKg: 110, reps: 5 },
      { date: '2026-10-09', weightKg: 115, reps: 5 },
    ],
  },
  {
    key: 'deadlift',
    name: 'Martwy ciąg',
    target1RM: 170,
    history: [
      { date: '2026-10-03', weightKg: 140, reps: 4 },
      { date: '2026-10-10', weightKg: 145, reps: 4 },
    ],
  },
  {
    key: 'pull_up',
    name: 'Podciąganie z ciężarem',
    target1RM: 35,
    history: [
      { date: '2026-10-04', weightKg: 15, reps: 6 },
      { date: '2026-10-11', weightKg: 17.5, reps: 5 },
    ],
  },
];

export function OuraGarminTrainingView({ data }: { data: OuraHealthHubData }) {
  const activities = data.stravaActivities ?? [];
  const runs = activities.filter((activity) => /run/i.test(activity.sport_type ?? ''));
  const todayActivities = activities.filter(
    (activity) => activity.start_date && formatWarsawDate(activity.start_date) === data.date
  );
  const zones = todayActivities.reduce<number[]>((sum, activity) => {
    activityHeartRateZones(activity).forEach((seconds, index) => {
      sum[index] = (sum[index] ?? 0) + seconds;
    });
    return sum;
  }, []);
  const totalSeconds = zones.reduce((sum, seconds) => sum + seconds, 0);
  const cardio = data.strainRow?.date === data.date ? data.strainRow?.cardio_load : null;
  const strength = data.strainRow?.date === data.date ? data.strainRow?.strength_load : null;
  const strengthSummary = summarizeStrengthProgression(DEFAULT_STRENGTH_LIFTS, 80);

  return (
    <div className="space-y-5 pb-12">
      {/* Kołowa tarcza Strain z łukiem docelowym (Target Strain Dial) */}
      <CircularTargetStrainCard
        currentStrain={data.strainRow?.strain_score}
        targetMin={10.0}
        targetMax={15.0}
        durationMinutes={totalSeconds > 0 ? Math.round(totalSeconds / 60) : 0}
        totalCaloriesKcal={data.enhanced?.active_calories ?? 0}
      />

      {/* Rozbicie obciążenia Cardio vs Muscular + Regeneracja partii mięśniowych */}
      <MuscularCardioLoadCard
        input={{
          cardioLoad: cardio,
          strengthLoad: strength,
        }}
      />

      {/* Akumulacja kardio Strefy 2 (Peter Attia 150 min/tydzień) */}
      <Zone2WeeklyCard activities={activities} asOfDateStr={data.date ?? undefined} />

      {/* Progresja siły 1RM i Big 3 Total */}
      <StrengthProgressionCard summary={strengthSummary} />

      <div className="grid grid-cols-2 gap-3">
        <section className="rounded-2xl border border-border-custom bg-surface p-4 space-y-2">
          <h2 className="text-xs font-bold">Sparky · obciążenie cardio</h2>
          <p className="text-2xl font-bold">{cardio ?? '—'}</p>
          <p className="text-xs text-text-secondary">
            {data.date ?? 'Brak daty'} · model obciążenia, nie pomiar regeneracji.
          </p>
        </section>
        <section className="rounded-2xl border border-border-custom bg-surface p-4 space-y-2">
          <h2 className="text-xs font-bold">VO₂max z urządzenia</h2>
          <p className="text-2xl font-bold">{data.garminVo2Max ?? '—'}</p>
          <p className="text-xs text-text-secondary">
            {data.garminVo2Max == null
              ? 'Brak zapisanej estymacji z urządzenia.'
              : `${data.externalVo2Source ?? 'Garmin'} · estymacja, nie wynik laboratoryjny.`}
          </p>
        </section>
      </div>

      <RacePredictorCard activities={activities} />

      <section className="rounded-2xl border border-border-custom bg-surface p-4 space-y-3">
        <h3 className="font-bold">Strefy tętna · {data.date ?? 'brak daty'}</h3>
        {!zones.length ? (
          <DataStateNotice
            title="Brak danych stref tętna"
            detail="Źródło nie dostarczyło czasów w strefach dla tego dnia."
          />
        ) : (
          <>
            {zones.map((seconds, index) => (
              <div key={index} className="space-y-1">
                <p className="text-xs">
                  Z{index + 1} · {(seconds / 60).toFixed(1)} min
                </p>
                <div className="h-2 rounded-full bg-surface-raised">
                  <div
                    className="h-full rounded-full bg-info"
                    style={{ width: `${totalSeconds > 0 ? (seconds / totalSeconds) * 100 : 0}%` }}
                  />
                </div>
              </div>
            ))}
            <p className="text-xs text-text-secondary">
              Strefy według konfiguracji źródła. Różne urządzenia mogą mieć różne progi.
            </p>
          </>
        )}
      </section>

      <section className="space-y-3">
        <h3 className="font-bold">Ostatnie biegi · Garmin przez Intervals.icu</h3>
        {!runs.length && (
          <DataStateNotice
            title="Brak zarejestrowanych biegów"
            detail="Sprawdź synchronizację Intervals.icu; brak wpisu nie oznacza opuszczenia treningu."
          />
        )}
        {runs.map((activity, index) => (
          <article
            key={activity.start_date ?? index}
            className="rounded-2xl border border-border-custom bg-surface p-4 space-y-2"
          >
            <h4 className="font-semibold">{activity.name ?? 'Bieg'}</h4>
            <p className="text-xs text-text-secondary">
              {activity.start_date ? formatWarsawDate(activity.start_date) : 'Brak daty'} ·{' '}
              {activitySourceLabel(activity)}
            </p>
            <p className="text-sm">
              {activity.distance != null ? `${(activity.distance / 1000).toFixed(1)} km` : 'Brak dystansu'} ·{' '}
              {activity.moving_time != null ? formatDuration(activity.moving_time) : 'Brak czasu'}
            </p>
            <p className="text-xs text-text-secondary">
              Tempo:{' '}
              {activity.moving_time && activity.distance
                ? formatPace(activity.moving_time, activity.distance)
                : '—'}{' '}
              · HR: {activity.hr_avg ?? activity.average_heartrate ?? '—'} bpm
            </p>
          </article>
        ))}
      </section>
    </div>
  );
}
