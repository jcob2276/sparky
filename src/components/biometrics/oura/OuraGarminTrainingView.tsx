import type { OuraHealthHubData } from './types';
import {
  activityHeartRateZones,
  activitySourceLabel,
  extractRunningPBs,
  extractBiometricPBs,
  buildPersonalBestsSummary,
} from '@vanguard/domain';
import { formatWarsawDate } from '../../../lib/date';
import DataStateNotice from '../../core/DataStateNotice';
import { RacePredictorCard } from '../workout/RacePredictorCard';
import { CircularTargetStrainCard } from '../health/CircularTargetStrainCard';
import { MuscularCardioLoadCard } from '../health/MuscularCardioLoadCard';
import { Zone2WeeklyCard } from '../health/Zone2WeeklyCard';
import { PersonalBestsCard } from '../health/PersonalBestsCard';
import { CardioDriftCard } from '../health/CardioDriftCard';
import { HeartRateRecoveryCard } from '../health/HeartRateRecoveryCard';

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

const HeartRateZonesSection: React.FC<{ zones: number[]; totalSeconds: number; dateStr?: string | null }> = ({
  zones,
  totalSeconds,
  dateStr,
}) => (
  <section className="rounded-2xl border border-border-custom bg-surface p-4 space-y-3">
    <h3 className="font-bold">Strefy tętna · {dateStr ?? 'brak daty'}</h3>
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
);

const RecentRunsSection: React.FC<{ runs: NonNullable<OuraHealthHubData['stravaActivities']> }> = ({ runs }) => (
  <section className="space-y-3">
    <h3 className="font-bold">Ostatnie zapisane biegi</h3>
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
);

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
  const strain = data.strainRow?.date === data.date ? data.strainRow : null;
  const cardio = strain?.cardio_load;
  const strength = strain?.strength_load;
  const recordedDurations = todayActivities.flatMap((activity) => activity.moving_time == null ? [] : [activity.moving_time]);
  const durationMinutes = recordedDurations.length ? recordedDurations.reduce((sum, seconds) => sum + seconds, 0) / 60 : null;

  const runningPBs = extractRunningPBs(activities);
  const biometricHistorySource = data.enhancedHistory && data.enhancedHistory.length > 0
    ? data.enhancedHistory.map((day) => ({
        date: day.date,
        hrv: day.sleep_average_hrv ?? 0,
        resting_hr: day.sleep_lowest_heart_rate ?? 0,
        deep_sleep_minutes: day.deep_sleep_hours ? Math.round(day.deep_sleep_hours * 60) : 0,
        strain: 0,
      }))
    : (data.enhanced
        ? [
            {
              date: data.date ?? 'today',
              hrv: data.enhanced.sleep_average_hrv ?? 0,
              resting_hr: data.enhanced.sleep_lowest_heart_rate ?? 0,
              deep_sleep_minutes: data.enhanced.deep_sleep_hours ? Math.round(data.enhanced.deep_sleep_hours * 60) : 0,
              strain: data.strainRow?.strain_score ?? 0,
            },
          ]
        : []);
  const biometricPBs = extractBiometricPBs(biometricHistorySource);
  const pbSummary = buildPersonalBestsSummary(runningPBs, [], biometricPBs);

  const latestRun = runs[0];
  const hasRunTelemetry = Boolean(
    latestRun &&
    latestRun.distance &&
    latestRun.distance > 500 &&
    latestRun.moving_time &&
    latestRun.moving_time > 300 &&
    (latestRun.hr_avg || latestRun.average_heartrate)
  );

  return (
    <div className="space-y-5 pb-12">
      {/* Kołowa tarcza Strain z łukiem docelowym (Target Strain Dial) */}
      <CircularTargetStrainCard
        currentStrain={strain?.strain_score}
        durationMinutes={durationMinutes}
        totalCaloriesKcal={data.enhanced?.date === data.date ? data.enhanced?.active_calories : null}
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

      {/* Sala Rekordów Życiowych (PR Trophy Room) */}
      <PersonalBestsCard summary={pbSummary} />

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

      {/* Analiza dryfu tętna i rozprzężenia tlenowego (Joe Friel / Bevel) */}
      {/* Agregaty sesji nie zawierają osobnych pomiarów obu połówek. */}
      <CardioDriftCard data={null} />

      {/* Odzyskiwanie tętna po wysiłku HRR (Bevel / ACSM Clinical) */}
      <HeartRateRecoveryCard
        peakHeartRate={hasRunTelemetry ? (latestRun?.hr_max ?? latestRun?.average_heartrate ?? null) : null}
        heartRateAt60s={null}
        workoutName={hasRunTelemetry ? (latestRun?.name ?? undefined) : undefined}
      />

      <HeartRateZonesSection zones={zones} totalSeconds={totalSeconds} dateStr={data.date} />

      <RecentRunsSection runs={runs} />
    </div>
  );
}
