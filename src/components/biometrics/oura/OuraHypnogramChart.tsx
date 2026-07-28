import { buildSleepTimeline, type SleepStage } from '../../../lib/biometrics/ouraSleepTimeline';
import type { OuraHealthHubData } from './types';

const STAGE_STYLE: Record<SleepStage, {
  label: string;
  height: string;
  color: string;
}> = {
  awake: { label: 'Stan czuwania', height: '100%', color: 'bg-stone-100' },
  rem: { label: 'REM', height: '74%', color: 'bg-sky-300' },
  light: { label: 'Płytki', height: '49%', color: 'bg-sky-500' },
  deep: { label: 'Głęboki sen', height: '24%', color: 'bg-sky-800' },
};

function formatDuration(hours: number): string {
  if (hours <= 0) return '--';
  const totalMinutes = Math.round(hours * 60);
  return `${Math.floor(totalMinutes / 60)} h ${totalMinutes % 60} min`;
}

export function OuraHypnogramChart({ enhanced, oura, nightDetails }: OuraHealthHubData) {
  const totalSleepHours = enhanced?.total_sleep_hours ?? oura?.total_sleep_hours ?? 0;
  const timeInBedHours = enhanced?.time_in_bed_hours ?? 0;
  const awakeMinutes = enhanced?.awake_time_minutes ?? 0;
  const remHours = enhanced?.rem_sleep_hours ?? oura?.rem_sleep_hours ?? 0;
  const deepHours = enhanced?.deep_sleep_hours ?? oura?.deep_sleep_hours ?? 0;
  const lightHours = enhanced?.light_sleep_hours
    ?? Math.max(0, totalSleepHours - remHours - deepHours);
  const totalSleepMinutes = Math.max(1, Math.round(totalSleepHours * 60));
  const timeline = buildSleepTimeline({
    phases: nightDetails?.phaseStatus === 'available'
      ? nightDetails.phases.map((point) => point.phase_code).join('')
      : enhanced?.sleep_phase_5_min,
    bedtimeStart: enhanced?.bedtime_start,
    bedtimeEnd: enhanced?.bedtime_end,
  });
  const stageRows = [
    { stage: 'awake' as const, duration: awakeMinutes / 60, percent: null },
    { stage: 'rem' as const, duration: remHours, percent: Math.round(remHours * 60 / totalSleepMinutes * 100) },
    { stage: 'light' as const, duration: lightHours, percent: Math.round(lightHours * 60 / totalSleepMinutes * 100) },
    { stage: 'deep' as const, duration: deepHours, percent: Math.round(deepHours * 60 / totalSleepMinutes * 100) },
  ];

  return (
    <section className="space-y-5 rounded-3xl border border-white/10 bg-slate-900/90 p-5 shadow-2xl">
      <header>
        <p className="text-3xs font-black uppercase tracking-widest text-slate-400">Czas snu</p>
        <div className="mt-1 flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <strong className="text-3xl font-semibold text-white">
            {formatDuration(totalSleepHours)}
          </strong>
          <span className="text-xs text-slate-400">
            Całkowity czas trwania {timeInBedHours > 0 ? formatDuration(timeInBedHours) : '--'}
          </span>
        </div>
      </header>

      <div className="space-y-3">
        <div
          className="relative h-52 overflow-hidden rounded-2xl border border-white/5 bg-black/30"
          aria-label="Przebieg faz snu"
        >
          {timeline.status === 'available' ? timeline.segments.map((segment) => {
            const style = STAGE_STYLE[segment.stage];
            return (
              <div
                key={`${segment.startBlock}-${segment.stage}`}
                title={style.label}
                className={`absolute bottom-0 ${style.color}`}
                style={{
                  left: `${segment.startBlock / timeline.totalBlocks * 100}%`,
                  width: `${segment.blocks / timeline.totalBlocks * 100}%`,
                  height: style.height,
                }}
              />
            );
          }) : (
            <div className="grid h-full place-items-center px-6 text-center text-xs font-semibold text-slate-500">
              Brak szczegółowego przebiegu faz dla tej nocy
            </div>
          )}
        </div>

        {timeline.axisLabels.length > 0 && (
          <div className="flex justify-between px-1 text-3xs font-bold text-slate-500">
            {timeline.axisLabels.map((label, index) => (
              <span key={`${label}-${index}`}>{label}</span>
            ))}
          </div>
        )}

        <div className="grid grid-cols-2 gap-2 border-t border-white/5 pt-3 sm:grid-cols-4">
          {(Object.keys(STAGE_STYLE) as SleepStage[]).map((stage) => (
            <span key={stage} className="flex items-center gap-2 text-xs text-slate-400">
              <span className={`h-2.5 w-2.5 rounded-full ${STAGE_STYLE[stage].color}`} />
              {STAGE_STYLE[stage].label}
            </span>
          ))}
        </div>
      </div>

      <div className="space-y-2 border-t border-white/10 pt-4">
        <p className="text-3xs font-black uppercase tracking-widest text-slate-400">Ruch</p>
        <div className="rounded-xl border border-white/5 bg-black/20 px-3 py-3 text-xs font-semibold text-slate-500">
          Brak danych o ruchu dla tej nocy
        </div>
      </div>

      <div className="space-y-3 border-t border-white/10 pt-4">
        {stageRows.map(({ stage, duration, percent }) => (
          <div key={stage} className="flex items-center justify-between gap-3 text-sm">
            <span className="flex min-w-0 items-center gap-2 text-slate-300">
              <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${STAGE_STYLE[stage].color}`} />
              {STAGE_STYLE[stage].label}
            </span>
            <strong className="whitespace-nowrap text-white">
              {formatDuration(duration)}
              {percent !== null && duration > 0 && (
                <span className="ml-1 font-normal text-slate-400">{percent}%</span>
              )}
            </strong>
          </div>
        ))}
      </div>
    </section>
  );
}
