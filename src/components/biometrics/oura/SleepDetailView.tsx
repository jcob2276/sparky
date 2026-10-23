import { Moon } from 'lucide-react';
import { buildSleepTimeline, type SleepStage } from '../../../lib/biometrics/ouraSleepTimeline';
import { SleepMovementRow } from './SleepMovementRow';
import { SleepStageSummary } from './SleepStageSummary';
import type { OuraHealthHubData } from './types';
import { NightSignalChart } from './NightSignalChart';

const STAGE_HEIGHT: Record<SleepStage, string> = {
  awake: '100%',
  rem: '74%',
  light: '49%',
  deep: '24%',
};

const STAGE_COLOR: Record<SleepStage, string> = {
  awake: 'bg-stone-100',
  rem: 'bg-info/60',
  light: 'bg-info',
  deep: 'bg-info/35',
};

const PHASE_NAME_TO_CODE: Record<string, string> = {
  deep: '1',
  light: '2',
  rem: '3',
  awake: '4',
};

const duration = (hours: number | null) => {
  if (hours == null || !Number.isFinite(hours)) return 'Brak danych';
  const minutes = Math.round(hours * 60);
  return `${Math.floor(minutes / 60)} h ${minutes % 60} min`;
};

function average(values: Array<number | null>): number | null {
  const measured = values.filter((entry): entry is number => entry != null && entry > 0);
  return measured.length === 0
    ? null
    : Math.round(measured.reduce((sum, entry) => sum + entry, 0) / measured.length);
}

export function SleepDetailView({ data }: { data: OuraHealthHubData }) {
  const date = data.date ?? data.oura?.date ?? data.enhanced?.date ?? null;
  const enhanced = date && data.enhanced?.date === date ? data.enhanced : null;
  const oura = date && data.oura?.date === date ? data.oura : null;
  const nightDetails = date && data.nightDetails?.date === date ? data.nightDetails : null;
  const totalSleepHours = enhanced?.total_sleep_hours ?? oura?.total_sleep_hours ?? null;
  const bedtimeStart = enhanced?.bedtime_start ?? oura?.bedtime_timestamp ?? null;
  const bedtimeEnd = enhanced?.bedtime_end ?? oura?.bedtime_end_timestamp ?? null;
  const bedtimeDurationHours = bedtimeStart && bedtimeEnd && Date.parse(bedtimeEnd) > Date.parse(bedtimeStart)
    ? (Date.parse(bedtimeEnd) - Date.parse(bedtimeStart)) / 3_600_000
    : null;
  const timeInBedHours = enhanced?.time_in_bed_hours ?? (oura && bedtimeDurationHours != null ? bedtimeDurationHours : null);
  const sleepScore = enhanced?.sleep_score ?? oura?.sleep_score ?? null;
  const totalSleepMinutes = totalSleepHours == null ? null : Math.round(totalSleepHours * 60);
  const remHours = enhanced?.rem_sleep_hours ?? oura?.rem_sleep_hours ?? null;
  const deepHours = enhanced?.deep_sleep_hours ?? oura?.deep_sleep_hours ?? null;
  const remMinutes = remHours == null ? null : Math.round(remHours * 60);
  const deepMinutes = deepHours == null ? null : Math.round(deepHours * 60);
  const lightMinutes = enhanced?.light_sleep_hours == null ? null : Math.round(enhanced.light_sleep_hours * 60);
  const awakeMinutes = enhanced?.awake_time_minutes ?? null;
  const measuredPhaseString = nightDetails?.phaseStatus === 'available'
    ? nightDetails.phases.map((point) => {
        if (point.phase_code != null) return String(point.phase_code);
        if (point.phase && PHASE_NAME_TO_CODE[point.phase]) return PHASE_NAME_TO_CODE[point.phase];
        return '?';
      }).join('')
    : enhanced?.sleep_phase_5_min;
  const timeline = buildSleepTimeline({
    phases: measuredPhaseString,
    bedtimeStart,
    bedtimeEnd,
  });
  const averageHeartRate = average(nightDetails?.heartRate.map((point) => point.bpm) ?? []);
  const averageHrv = average(nightDetails?.hrv.map((point) => point.hrv) ?? []);
  const heartRatePoints = (nightDetails?.heartRate ?? []).map((point) => ({
    ts: point.ts,
    value: point.bpm,
  }));
  const hrvPoints = (nightDetails?.hrv ?? []).map((point) => ({
    ts: point.ts,
    value: point.hrv,
  }));
  const lowestHeartRate = enhanced?.sleep_lowest_heart_rate
    ?? heartRatePoints.reduce<number | null>(
      (lowest, point) => (point.value == null || point.value <= 0) ? lowest : Math.min(lowest ?? point.value, point.value),
      null,
    );
  const maximumHrv = hrvPoints.reduce<number | null>(
    (highest, point) => (point.value == null || point.value <= 0) ? highest : Math.max(highest ?? point.value, point.value),
    null,
  );

  return (
    <div className="space-y-5">
      <p className="px-1 text-sm text-text-muted">
        Noc zakończona {date ?? '— brak wybranej daty'}
        {sleepScore != null && <> · wynik snu <span className="font-semibold text-text-primary">{Math.round(sleepScore)}</span></>}
      </p>

      <section className="overflow-hidden rounded-xl border border-white/5 bg-surface-2">
        <div className="p-6">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold tracking-normal text-text-secondary">Czas snu</p>
            <Moon className="text-success" size={22} />
          </div>
          <p className="mt-3 text-5xl font-light tracking-tight text-text-primary">{duration(totalSleepHours)}</p>
          <p className="mt-3 text-sm text-text-secondary">
            Całkowity czas trwania {duration(timeInBedHours)}
          </p>
        </div>

        <div
          role="img"
          aria-label="Przebieg faz snu (hipnogram)"
          className="relative mx-4 h-64 border-b border-white/10 bg-black/10"
        >
          {timeline.status === 'available' ? timeline.segments.map((segment) => (
            <div
              key={`${segment.startBlock}-${segment.stage}`}
              className={`absolute bottom-0 ${STAGE_COLOR[segment.stage]}`}
              style={{
                left: `${segment.startBlock / timeline.totalBlocks * 100}%`,
                width: `${segment.blocks / timeline.totalBlocks * 100}%`,
                height: STAGE_HEIGHT[segment.stage],
              }}
            />
          )) : (
            <div className="grid h-full place-items-center px-5 text-center text-sm text-text-muted">
              Brak szczegółowego przebiegu faz dla tej nocy
            </div>
          )}
        </div>

        {timeline.axisLabels.length > 0 && (
          <div className="flex justify-between px-5 py-3 text-xs text-text-secondary">
            {timeline.axisLabels.map((label, index) => (
              <span
                key={`${label}-${index}`}
                className={index === 1 || index === 3 ? 'hidden sm:inline' : ''}
              >
                {label}
              </span>
            ))}
          </div>
        )}

        {timeline.durationMismatchMinutes != null && timeline.durationMismatchMinutes > 10 && (
          <div className="mx-5 mb-4 rounded-2xl border border-warning/25 bg-warning/10 px-4 py-3 text-xs leading-5 text-warning">
            Niespójność danych dla {date ?? 'tej nocy'}: przebieg faz różni się od zapisanego przedziału o {timeline.durationMismatchMinutes} min.
          </div>
        )}

        <div className="px-6">
          <SleepMovementRow movementItems={enhanced?.movement_items} />
        </div>
        <div className="p-6">
          <SleepStageSummary
            awakeMinutes={awakeMinutes}
            deepMinutes={deepMinutes}
            lightMinutes={lightMinutes}
            remMinutes={remMinutes}
            totalSleepMinutes={totalSleepMinutes}
          />
        </div>
      </section>

      <NightSignalChart
        ariaLabel="Przebieg tętna podczas snu"
        average={enhanced?.sleep_average_heart_rate == null
          ? averageHeartRate
          : Math.round(enhanced.sleep_average_heart_rate)}
        averageLabel="Średnie tętno"
        colorClass="text-text-primary"
        points={heartRatePoints}
        summary={lowestHeartRate == null ? 'Minimum niedostępne' : `Najniższe ${Math.round(lowestHeartRate)} bpm`}
        title="Tętno podczas snu"
        unit="bpm"
      />
      <NightSignalChart
        ariaLabel="Przebieg HRV podczas snu"
        average={enhanced?.sleep_average_hrv == null ? averageHrv : Math.round(enhanced.sleep_average_hrv)}
        averageLabel="Średnie HRV"
        colorClass="text-info"
        points={hrvPoints}
        summary={maximumHrv == null ? 'Maksimum niedostępne' : `Maks. ${Math.round(maximumHrv)} ms`}
        title="Zmienność tętna"
        unit="ms"
      />
    </div>
  );
}
