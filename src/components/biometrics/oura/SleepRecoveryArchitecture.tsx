import React from 'react';

interface SleepRecoveryArchitectureProps {
  deepMinutes: number;
  remMinutes: number;
  totalSleepMinutes: number;
  avgHrv: number | null;
  lowestHr: number | null;
  formatMinutes: (mins: number) => string;
  hypnogramString?: string | null;
  sleepContributors?: Record<string, number> | null;
}

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
  sleepContributors,
}: SleepRecoveryArchitectureProps) {
  const hypnoSegments = hypnogramString ? hypnogramString.split('') : [];

  return (
    <div className="space-y-4">
      <h3 className="text-2xs font-black uppercase tracking-[var(--ds-arbitrary-0-18em)] text-text-muted px-1">
        Architektura faz nocy & telemetria Oura
      </h3>

      {/* Visual Hypnogram Timeline */}
      {hypnoSegments.length > 0 && (
        <div className="rounded-2xl border border-white/10 bg-surface-solid/50 p-4 space-y-3">
          <div className="flex items-center justify-between text-2xs">
            <span className="font-bold text-text-primary">Nocny Hipnogram (co 5 min)</span>
            <span className="text-3xs text-text-muted font-mono">22:02 — 04:09</span>
          </div>

          <div className="flex h-6 w-full overflow-hidden rounded-lg bg-black/40 p-0.5 gap-px">
            {hypnoSegments.map((c, idx) => {
              const bg =
                c === '1'
                  ? 'bg-indigo-500' // Deep
                  : c === '3'
                  ? 'bg-teal-400' // REM
                  : c === '4'
                  ? 'bg-amber-400' // Awake
                  : 'bg-sky-400/70'; // Light
              return (
                <div
                  key={idx}
                  className={`h-full flex-1 rounded-2xs ${bg}`}
                  title={`Interwał 5 min: faza ${c}`}
                />
              );
            })}
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
      )}

      {/* 4 Pillars of Night Recovery */}
      <div className="grid grid-cols-2 gap-2.5">
        <div className="rounded-2xl border border-white/10 bg-surface-solid/50 p-3.5">
          <span className="text-3xs font-black uppercase tracking-wider text-text-muted">Sen Głęboki (Deep)</span>
          <div className="mt-1 text-lg font-black text-text-primary">
            {deepMinutes > 0 ? formatMinutes(deepMinutes) : '—'}
          </div>
          <p className="mt-0.5 text-3xs text-text-muted">
            {totalSleepMinutes > 0 ? `${Math.round((deepMinutes / totalSleepMinutes) * 100)}% (norma 15-25%)` : 'Brak'}
          </p>
        </div>

        <div className="rounded-2xl border border-white/10 bg-surface-solid/50 p-3.5">
          <span className="text-3xs font-black uppercase tracking-wider text-text-muted">Sen REM (Psychika)</span>
          <div className="mt-1 text-lg font-black text-text-primary">
            {remMinutes > 0 ? formatMinutes(remMinutes) : '—'}
          </div>
          <p className="mt-0.5 text-3xs text-text-muted">
            {totalSleepMinutes > 0 ? `${Math.round((remMinutes / totalSleepMinutes) * 100)}% (norma 20-25%)` : 'Brak'}
          </p>
        </div>

        <div className="rounded-2xl border border-white/10 bg-surface-solid/50 p-3.5">
          <span className="text-3xs font-black uppercase tracking-wider text-text-muted">Średnie HRV</span>
          <div className="mt-1 text-lg font-black text-info font-mono">
            {avgHrv != null ? `${avgHrv} ms` : '—'}
          </div>
          <p className="mt-0.5 text-3xs text-text-muted">Tonus przywspółczulny</p>
        </div>

        <div className="rounded-2xl border border-white/10 bg-surface-solid/50 p-3.5">
          <span className="text-3xs font-black uppercase tracking-wider text-text-muted">Najniższe tętno (Dip)</span>
          <div className="mt-1 text-lg font-black text-text-primary font-mono">
            {lowestHr != null ? `${lowestHr} bpm` : '—'}
          </div>
          <p className="mt-0.5 text-3xs text-text-muted">Spoczynek nocy o 03:15</p>
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
              const score = typeof val === 'number' ? val : 0;
              const color = score >= 80 ? 'bg-success' : score >= 60 ? 'bg-warning' : 'bg-danger';
              return (
                <div key={key} className="space-y-1">
                  <div className="flex justify-between text-3xs">
                    <span className="text-text-secondary font-medium">{label}</span>
                    <span className="font-bold text-text-primary font-mono">{score}/100</span>
                  </div>
                  <div className="h-1.5 w-full rounded-full bg-white/5 overflow-hidden">
                    <div className={`h-full rounded-full ${color}`} style={{ width: `${score}%` }} />
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
