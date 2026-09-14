import { Activity, AlertCircle, CheckCircle2, Moon, Dumbbell } from 'lucide-react';
import { useWeeklyBodyPulse } from '../../lib/biometricsApi';
import { useUserId } from '../../store/useStore';
import { getTodayWarsaw } from '../../lib/date';
import { needsRecoveryCorrection } from '../../lib/horizonSignals';
import {
  bodyPulseHeadline,
  formatDurationHours,
  formatSleepDayLabel,
  type WeeklyBodyPulseData,
} from '../../lib/weeklyBodyPulse';
import Badge from '../ui/Badge';

export default function WeeklyBodyPulse() {
  const userId = useUserId();
  const { data, isLoading, isError } = useWeeklyBodyPulse(userId ?? '');
  if (!userId) return null;

  const today = getTodayWarsaw();
  const needsAttention = Boolean(
    data &&
      (needsRecoveryCorrection(data) ||
        (data.sleepAvgHours != null && data.sleepAvgHours < 6.5) ||
        (data.gymCount === 0 && data.runCount === 0)),
  );

  return (
    <section className="rounded-3xl border border-border-custom/60 bg-surface/70 p-4.5 space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="flex items-center gap-2 text-2xs font-black uppercase tracking-widest text-text-muted">
            <Activity size={12} className="text-primary" /> Ciało · 7 dni
          </p>
          <h3 className="mt-1 text-base font-bold text-text-primary">
            {isLoading
              ? 'Ładuję przebieg…'
              : isError
                ? 'Brak pełnych danych ciała'
                : data
                  ? bodyPulseHeadline(data)
                  : 'Brak danych'}
          </h3>
        </div>
        {needsAttention ? (
          <Badge variant="tag" color="var(--color-warning)" className="shrink-0">
            <AlertCircle size={12} className="mr-1 inline" /> Wymaga uwagi
          </Badge>
        ) : (
          <Badge variant="tag" color="var(--color-success)" className="shrink-0">
            <CheckCircle2 size={12} className="mr-1 inline" /> W normie
          </Badge>
        )}
      </div>

      {/* Activity chips */}
      <div className="rounded-2xl border border-border-custom/40 bg-surface/50 p-3">
        <p className="text-3xs font-black uppercase tracking-widest text-text-muted mb-2.5 flex items-center gap-1.5">
          <Dumbbell size={11} className="text-primary" /> Trening i aktywność
        </p>
        <div className="grid grid-cols-3 gap-2">
          <ActivityChip
            label="Siłownia"
            value={`${data?.gymCount ?? 0}`}
            active={Boolean(data && data.gymCount > 0)}
          />
          <ActivityChip
            label="Bieganie"
            value={formatRuns(data)}
            active={Boolean(data && data.runCount > 0)}
          />
          <ActivityChip
            label="Sauna"
            value={formatSauna(data)}
            active={Boolean(data && data.saunaCount > 0)}
          />
        </div>
      </div>

      {/* Sleep hero block */}
      <div className="rounded-2xl border border-primary/20 bg-primary/5 p-3.5 space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-3xs font-black uppercase tracking-widest text-primary flex items-center gap-1.5">
            <Moon size={11} /> Wskaźniki snu · śr.
          </p>
          {data && data.warningDays > 0 && (
            <span className="text-2xs font-extrabold text-warning">{data.warningDays}d poniżej normy</span>
          )}
        </div>

        {/* Hero: avg sleep duration */}
        <div className="flex items-baseline gap-3">
          <p className="text-3xl font-black tracking-tight text-text-primary leading-none">
            {formatDurationHours(data?.sleepAvgHours)}
          </p>
          <div className="flex flex-col">
            <span className="text-2xs font-bold text-text-muted uppercase tracking-wide">śr. sen</span>
            <span className="text-xs font-semibold text-text-secondary">
              {data?.avgBedtime ?? '—'} – {data?.avgWake ?? '—'}
            </span>
          </div>
        </div>

        {/* 2x2 score grid */}
        <div className="grid grid-cols-2 gap-2">
          <ScoreCell label="Sleep score" value={data?.sleepAvgScore ?? null} suffix="" />
          <ScoreCell label="Readiness" value={data?.avgReadiness ?? null} suffix="" />
          <ScoreCell label="HRV śr." value={data?.avgHrv ?? null} suffix=" ms" accent />
          <ScoreCell label="Zasypianie" value={data?.avgLatencyMin ?? null} suffix="m" />
        </div>

        {/* Deep/REM + Efficiency */}
        <div className="flex items-center justify-between gap-2 border-t border-border-custom/30 pt-2.5 text-xs">
          <div className="flex-1 min-w-0 flex items-center justify-between rounded-xl bg-surface/50 px-2.5 py-1.5 gap-1.5">
            <span className="text-text-muted font-medium text-2xs truncate">Głęboki / REM</span>
            <span className="font-bold text-text-primary shrink-0 text-xs">
              {formatDurationHours(data?.avgDeepHours)} / {formatDurationHours(data?.avgRemHours)}
            </span>
          </div>
          <div className="flex items-center justify-between rounded-xl bg-surface/50 px-2.5 py-1.5 gap-1.5 shrink-0">
            <span className="text-text-muted font-medium text-2xs">Eff.</span>
            <span className="font-bold text-text-primary text-xs">
              {data?.avgEfficiency == null ? '—' : `${data.avgEfficiency}%`}
            </span>
          </div>
        </div>

        {/* Best / Worst */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
          <div className="flex items-center justify-between rounded-xl bg-surface/50 px-2.5 py-1.5 min-w-0 gap-1.5">
            <span className="text-text-muted font-medium text-2xs shrink-0">Najlepszy</span>
            <span className="font-bold text-success text-2xs sm:text-xs truncate">{formatSleepDayLabel(data?.sleepBest ?? null, today)}</span>
          </div>
          <div className="flex items-center justify-between rounded-xl bg-surface/50 px-2.5 py-1.5 min-w-0 gap-1.5">
            <span className="text-text-muted font-medium text-2xs shrink-0">Najgorszy</span>
            <span className="font-bold text-warning text-2xs sm:text-xs truncate">{formatSleepDayLabel(data?.sleepWorst ?? null, today)}</span>
          </div>
        </div>
      </div>

      {/* Recovery inline */}
      {data?.averageRecovery != null && (
        <div className="flex items-center gap-2 text-xs px-0.5">
          <span className="text-text-muted font-medium">Recovery śr.</span>
          <span
            className={`font-extrabold ${
              data.averageRecovery >= 67
                ? 'text-success'
                : data.averageRecovery >= 34
                  ? 'text-warning'
                  : 'text-error'
            }`}
          >
            {data.averageRecovery}
          </span>
        </div>
      )}
    </section>
  );
}

function ScoreCell({
  label,
  value,
  suffix,
  accent,
}: {
  label: string;
  value: number | null;
  suffix: string;
  accent?: boolean;
}) {
  return (
    <div className="rounded-xl bg-surface/50 border border-border-custom/30 px-2.5 py-2 flex items-center justify-between gap-1">
      <span className="text-2xs font-bold uppercase tracking-wide text-text-muted truncate">{label}</span>
      <span className={`text-sm font-black shrink-0 ${accent ? 'text-primary' : 'text-text-primary'}`}>
        {value == null ? '—' : `${value}${suffix}`}
      </span>
    </div>
  );
}

function ActivityChip({ label, value, active }: { label: string; value: string; active: boolean }) {
  return (
    <div
      className={`rounded-xl px-2.5 py-2 transition-all min-w-0 ${
        active
          ? 'bg-primary/10 border border-primary/20'
          : 'bg-surface/50 border border-border-custom/30'
      }`}
    >
      <p className="text-3xs font-bold uppercase tracking-wider text-text-muted truncate">{label}</p>
      <p className={`mt-0.5 text-xs sm:text-sm font-black truncate ${active ? 'text-text-primary' : 'text-text-muted'}`}>{value}</p>
    </div>
  );
}

function formatRuns(data: WeeklyBodyPulseData | undefined): string {
  if (!data) return '0';
  if (data.runCount === 0) return '0';
  return data.runKm > 0 ? `${data.runCount} · ${data.runKm} km` : `${data.runCount}`;
}

function formatSauna(data: WeeklyBodyPulseData | undefined): string {
  if (!data) return '0';
  if (data.saunaCount === 0) return '0';
  return data.saunaMinutes > 0 ? `${data.saunaCount} · ${data.saunaMinutes} min` : `${data.saunaCount}`;
}
