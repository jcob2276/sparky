import { Moon } from 'lucide-react';
import { useWeeklyBodyPulse } from '../../lib/biometricsApi';
import { useUserId } from '../../store/useStore';
import { getTodayWarsaw } from '../../lib/date';
import {
  formatDurationHours,
  formatSleepDayLabel,
  type WeeklyBodyPulseData,
} from '../../lib/weeklyBodyPulse';
import DataStateNotice from './DataStateNotice';
import WeeklyCollapsible from './WeeklyCollapsible';

export default function WeeklyBodyPulse() {
  const userId = useUserId();
  const { data, isLoading, isError, error } = useWeeklyBodyPulse(userId ?? '');
  if (!userId) return null;
  if (isLoading) return <DataStateNotice tone="loading" title="Ładuję podsumowanie ciała" />;
  if (isError) return <DataStateNotice tone="warning" title="Podsumowanie ciała niedostępne" detail={error?.message ?? 'Nie udało się odczytać danych tygodnia.'} />;
  if (!data) return <DataStateNotice title="Brak podsumowania ciała" />;
  return <WeeklyBodyPulseContent data={data} />;
}

function WeeklyBodyPulseContent({ data }: { data: WeeklyBodyPulseData }) {
  const today = getTodayWarsaw();

  return (
    <WeeklyCollapsible
      icon={<Moon size={12} className="text-primary" />}
      title="Sen"
      summary={`${formatDurationHours(data.sleepAvgHours)}${data.sleepAvgScore != null ? ` · jakość ${data.sleepAvgScore}` : ''}`}
    >
      {data.warningDays > 0 && (
        <p className="text-2xs font-extrabold text-warning">{data.warningDays} dni ze statusem ostrzegawczym</p>
      )}
      <div className="flex items-baseline gap-3">
        <p className="text-3xl font-semibold leading-none tracking-tight text-text-primary">{formatDurationHours(data.sleepAvgHours)}</p>
        <span className="text-xs font-semibold text-text-secondary">{data.avgBedtime ?? '—'} – {data.avgWake ?? '—'}</span>
      </div>

      <div className="grid grid-cols-3 gap-2">
        <ScoreCell label="Jakość" value={data.sleepAvgScore} suffix="" />
        <ScoreCell label="HRV" value={data.avgHrv} suffix=" ms" accent />
        <ScoreCell label="Zasypianie" value={data.avgLatencyMin} suffix=" min" />
      </div>

      <p className="text-xs font-semibold text-text-secondary">
        Głęboki {formatDurationHours(data.avgDeepHours)} · REM {formatDurationHours(data.avgRemHours)}
        {' · '}najlepszy <span className="text-success">{formatSleepDayLabel(data.sleepBest, today)}</span>
        {' · '}najgorszy <span className="text-warning">{formatSleepDayLabel(data.sleepWorst, today)}</span>
      </p>
    </WeeklyCollapsible>
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
    <div className="min-w-0 rounded-xl border border-border-custom/30 bg-surface/50 px-2.5 py-2">
      <p className="truncate text-2xs font-bold tracking-wide text-text-muted">{label}</p>
      <span className={`text-sm font-semibold ${accent ? 'text-primary' : 'text-text-primary'}`}>
        {value == null ? '—' : `${value}${suffix}`}
      </span>
    </div>
  );
}
