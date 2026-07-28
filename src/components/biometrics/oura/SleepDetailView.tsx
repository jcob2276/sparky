import { Activity, HeartPulse, Moon } from 'lucide-react';
import { buildSleepTimeline, type SleepStage } from '../../../lib/biometrics/ouraSleepTimeline';
import { SleepMovementRow } from './SleepMovementRow';
import { SleepStageSummary } from './SleepStageSummary';
import type { OuraHealthHubData } from './types';
import { OuraContextSection } from './OuraContextSection';

const STAGE_HEIGHT: Record<SleepStage, string> = {
  awake: '100%',
  rem: '74%',
  light: '49%',
  deep: '24%',
};

const STAGE_COLOR: Record<SleepStage, string> = {
  awake: 'bg-stone-100',
  rem: 'bg-info/35',
  light: 'bg-info/70',
  deep: 'bg-info',
};

const duration = (hours: number) => {
  const minutes = Math.round(hours * 60);
  return `${Math.floor(minutes / 60)} h ${minutes % 60} min`;
};

function average(values: Array<number | null>): number | null {
  const measured = values.filter((entry): entry is number => entry != null);
  return measured.length === 0
    ? null
    : Math.round(measured.reduce((sum, entry) => sum + entry, 0) / measured.length);
}

export function SleepDetailView({ data }: { data: OuraHealthHubData }) {
  const enhanced = data.enhanced;
  const totalSleepHours = enhanced?.total_sleep_hours ?? data.oura?.total_sleep_hours ?? 0;
  const timeInBedHours = enhanced?.time_in_bed_hours ?? 0;
  const totalSleepMinutes = Math.max(1, Math.round(totalSleepHours * 60));
  const remMinutes = Math.round((enhanced?.rem_sleep_hours ?? data.oura?.rem_sleep_hours ?? 0) * 60);
  const deepMinutes = Math.round((enhanced?.deep_sleep_hours ?? data.oura?.deep_sleep_hours ?? 0) * 60);
  const lightMinutes = Math.round((enhanced?.light_sleep_hours ?? Math.max(0, totalSleepHours - remMinutes / 60 - deepMinutes / 60)) * 60);
  const awakeMinutes = enhanced?.awake_time_minutes ?? Math.max(0, Math.round(timeInBedHours * 60) - totalSleepMinutes);
  const measuredPhaseString = data.nightDetails?.phaseStatus === 'available'
    ? data.nightDetails.phases.map((point) => point.phase_code).join('')
    : enhanced?.sleep_phase_5_min;
  const timeline = buildSleepTimeline({
    phases: measuredPhaseString,
    bedtimeStart: enhanced?.bedtime_start,
    bedtimeEnd: enhanced?.bedtime_end,
  });
  const averageHeartRate = average(data.nightDetails?.heartRate.map((point) => point.bpm) ?? []);
  const averageHrv = average(data.nightDetails?.hrv.map((point) => point.hrv) ?? []);

  return (
    <div className="space-y-5">
      <header className="px-1">
        <p className="text-sm text-text-muted">{data.date ?? 'Brak wybranej daty'}</p>
        <h1 className="mt-2 text-4xl font-light text-white">Szczegółowe dane</h1>
      </header>

      <section className="overflow-hidden rounded-xl border border-white/5 bg-surface-2">
        <div className="p-6">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-widest text-text-secondary">Czas snu</p>
            <Moon className="text-success" size={22} />
          </div>
          <p className="mt-3 text-5xl font-light tracking-tight text-white">{duration(totalSleepHours)}</p>
          <p className="mt-3 text-sm text-text-secondary">
            Całkowity czas trwania {timeInBedHours > 0 ? duration(timeInBedHours) : 'Brak danych'}
          </p>
        </div>

        <div className="relative mx-4 h-64 border-b border-white/10 bg-black/10">
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
            {timeline.axisLabels.map((label, index) => <span key={`${label}-${index}`}>{label}</span>)}
          </div>
        )}

        {timeline.durationMismatchMinutes != null && timeline.durationMismatchMinutes > 10 && (
          <div className="mx-5 mb-4 rounded-2xl border border-warning/25 bg-warning/10 px-4 py-3 text-xs leading-5 text-warning">
            Niespójność danych dla {data.date ?? 'tej nocy'}: przebieg faz różni się od zapisanego przedziału o {timeline.durationMismatchMinutes} min.
          </div>
        )}

        <div className="px-6">
          <SleepMovementRow />
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

      <div className="grid gap-3 sm:grid-cols-2">
        <article className="rounded-xl border border-white/5 bg-surface-2 p-5">
          <HeartPulse className="text-danger" size={22} />
          <p className="mt-8 text-sm text-text-secondary">Średnie tętno podczas snu</p>
          <p className="mt-2 text-3xl font-light text-white">{averageHeartRate == null ? 'Brak danych' : `${averageHeartRate} bpm`}</p>
        </article>
        <article className="rounded-xl border border-white/5 bg-surface-2 p-5">
          <Activity className="text-info" size={22} />
          <p className="mt-8 text-sm text-text-secondary">Średnie HRV podczas snu</p>
          <p className="mt-2 text-3xl font-light text-white">{averageHrv == null ? 'Brak danych' : `${averageHrv} ms`}</p>
        </article>
      </div>
      <OuraContextSection context={data.context} />
    </div>
  );
}
