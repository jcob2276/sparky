import React from 'react';
import { buildSleepTimeline, type SleepStage } from '../../../lib/biometrics/ouraSleepTimeline';
import DataStateNotice from '../../core/DataStateNotice';

interface SleepRecoveryArchitectureProps {
  deepMinutes: number | null;
  remMinutes: number | null;
  totalSleepMinutes: number | null;
  avgHrv: number | null;
  lowestHr: number | null;
  formatMinutes: (mins: number) => string;
  hypnogramString?: string | null;
  bedtimeStart?: string | null;
  bedtimeEnd?: string | null;
  date?: string | null;
  sleepContributors?: Record<string, number | null> | null;
}

const PHASE_COLOR: Record<SleepStage, string> = { deep: 'bg-indigo-500', rem: 'bg-teal-400', awake: 'bg-amber-400', light: 'bg-sky-400/70' };

const CONTRIBUTOR_LABELS: Record<string, string> = {
  total_sleep: 'Długość snu',
  deep_sleep: 'Sen głęboki',
  rem_sleep: 'Faza REM',
  efficiency: 'Wydajność snu',
  restfulness: 'Spokój nocy (brak ruchów)',
  latency: 'Latencja (czas zasypiania)',
  timing: 'Pora pójścia spać',
};

export function SleepRecoveryArchitecture({
  deepMinutes,
  remMinutes,
  totalSleepMinutes,
  avgHrv,
  lowestHr,
  formatMinutes,
  hypnogramString,
  bedtimeStart,
  bedtimeEnd,
  date,
  sleepContributors,
}: SleepRecoveryArchitectureProps) {
  const timeline = buildSleepTimeline({ phases: hypnogramString, bedtimeStart, bedtimeEnd });

  return (
    <div className="space-y-4">
      <h3 className="text-2xs font-black uppercase tracking-[var(--ds-arbitrary-0-18em)] text-text-muted px-1">
        Architektura faz nocy & telemetria Oura
      </h3>

      {/* Visual Hypnogram Timeline */}
      {timeline.status === 'available' ? (
        <div className="rounded-2xl border border-white/10 bg-surface-solid/50 p-4 space-y-3">
          <div className="flex items-center justify-between text-2xs">
            <span className="font-bold text-text-primary">Nocny Hipnogram (co 5 min)</span>
            <span className="text-3xs text-text-muted font-mono">{timeline.axisLabels.length ? `${timeline.axisLabels[0]} — ${timeline.axisLabels.at(-1)}` : 'Brak godzin nocy'}</span>
          </div>

          <div className="flex h-6 w-full overflow-hidden rounded-lg bg-black/40 p-0.5 gap-px">
            {timeline.segments.map((segment) => (
                <div
                  key={segment.startBlock}
                  className={`h-full rounded-2xs ${PHASE_COLOR[segment.stage]}`}
                  style={{ flex: segment.blocks }}
                  title={`Faza ${segment.stage}: ${segment.blocks * 5} min`}
                />
            ))}
          </div>

          {/* Legend */}
          <div className="flex flex-wrap items-center justify-between gap-2 text-3xs text-text-muted pt-1">
            <span className="flex items-center gap-1">
              <span className="h-2 w-2 rounded-full bg-violet-500" /> Głęboki (NREM 3)
            </span>
            <span className="flex items-center gap-1">
              <span className="h-2 w-2 rounded-full bg-teal-400" /> REM
            </span>
            <span className="flex items-center gap-1">
              <span className="h-2 w-2 rounded-full bg-sky-400/70" /> Płytki
            </span>
            <span className="flex items-center gap-1">
              <span className="h-2 w-2 rounded-full bg-yellow-400" /> Czuwanie
            </span>
          </div>
        </div>
      ) : <DataStateNotice title={timeline.status === 'invalid' ? 'Nieprawidłowy przebieg faz snu' : 'Brak przebiegu faz snu'} detail={`Oura · ${date ?? 'brak daty'}. Zapis przebiegu nocy jest niedostępny.`} />}
      {timeline.durationMismatchMinutes != null && timeline.durationMismatchMinutes > 10 && <DataStateNotice tone="warning" title="Niespójny czas przebiegu faz" detail={`${date ?? 'Noc'}: fazy obejmują ${timeline.measuredMinutes} min, a zapisany przedział ${timeline.intervalMinutes} min.`} />}

      {/* 4 Pillars of Night Recovery */}
      <div className="grid grid-cols-2 gap-2.5">
        <div className="rounded-2xl border border-white/10 bg-surface-solid/50 p-3.5">
          <span className="text-3xs font-black uppercase tracking-wider text-text-muted">Sen Głęboki (Deep)</span>
          <div className="mt-1 text-lg font-black text-text-primary">
            {deepMinutes != null ? formatMinutes(deepMinutes) : '—'}
          </div>
          <p className="mt-0.5 text-3xs text-text-muted">
            {totalSleepMinutes != null && totalSleepMinutes > 0 && deepMinutes != null ? `${Math.round((deepMinutes / totalSleepMinutes) * 100)}% zapisanego snu` : 'Brak danych'}
          </p>
        </div>

        <div className="rounded-2xl border border-white/10 bg-surface-solid/50 p-3.5">
          <span className="text-3xs font-black uppercase tracking-wider text-text-muted">Sen REM</span>
          <div className="mt-1 text-lg font-black text-text-primary">
            {remMinutes != null ? formatMinutes(remMinutes) : '—'}
          </div>
          <p className="mt-0.5 text-3xs text-text-muted">
            {totalSleepMinutes != null && totalSleepMinutes > 0 && remMinutes != null ? `${Math.round((remMinutes / totalSleepMinutes) * 100)}% zapisanego snu` : 'Brak danych'}
          </p>
        </div>

        <div className="rounded-2xl border border-white/10 bg-surface-solid/50 p-3.5">
          <span className="text-3xs font-black uppercase tracking-wider text-text-muted">Średnie HRV</span>
          <div className="mt-1 text-lg font-black text-info font-mono">
            {avgHrv != null ? `${avgHrv} ms` : '—'}
          </div>
          <p className="mt-0.5 text-3xs text-text-muted">Średnia podczas snu</p>
        </div>

        <div className="rounded-2xl border border-white/10 bg-surface-solid/50 p-3.5">
          <span className="text-3xs font-black uppercase tracking-wider text-text-muted">Najniższe tętno</span>
          <div className="mt-1 text-lg font-black text-text-primary font-mono">
            {lowestHr != null ? `${lowestHr} bpm` : '—'}
          </div>
          <p className="mt-0.5 text-3xs text-text-muted">Minimum przekazane przez Oura</p>
        </div>
      </div>

      {/* Sleep Contributors */}
      {sleepContributors && Object.keys(sleepContributors).length > 0 && (
        <div className="rounded-2xl border border-white/10 bg-surface-solid/50 p-4 space-y-3">
          <h4 className="text-xs font-black uppercase tracking-wider text-text-primary">
            Składowe jakości snu Oura (Contributors)
          </h4>
          <div className="space-y-2">
            {Object.entries(sleepContributors).map(([key, val]) => {
              const label = CONTRIBUTOR_LABELS[key] || key.replace(/_/g, ' ');
              const score = typeof val === 'number' && Number.isFinite(val) ? Math.max(0, Math.min(100, val)) : null;
              const color = score == null ? 'bg-surface-3' : score >= 80 ? 'bg-success' : score >= 60 ? 'bg-warning' : 'bg-danger';
              return (
                <div key={key} className="space-y-1">
                  <div className="flex justify-between text-3xs">
                    <span className="text-text-secondary font-medium">{label}</span>
                    <span className="font-bold text-text-primary font-mono">{score == null ? '—' : `${score}/100`}</span>
                  </div>
                  <div className="h-1.5 w-full rounded-full bg-white/5 overflow-hidden">
                    <div className={`h-full rounded-full ${color}`} style={{ width: `${score ?? 0}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
