import Skeleton from '../../ui/Skeleton';
import { Activity } from 'lucide-react';
import type { RunIntensity, RunningLoad } from '../../../lib/health/runningLoad';

interface Props {
  load: RunningLoad | undefined;
  loading: boolean;
}

const INTENSITY_LABEL: Record<RunIntensity, string> = { easy: 'Spokojny', tempo: 'Tempo', hard: 'Ciężki' };
const INTENSITY_STYLE: Record<RunIntensity, string> = {
  easy: 'bg-success/15 text-success',
  tempo: 'bg-warning/15 text-warning',
  hard: 'bg-danger/15 text-danger',
};

const formatKm = (km: number) => String(km).replace('.', ',');

/** Obciążenie biegowe liczone z tętna (nie z kilometrów) — obok siłowego, bo razem składają się na zmęczenie nóg. */
export default function TrainingHubRunning({ load, loading }: Props) {
  if (loading || !load) {
    return <Skeleton variant="block" className="h-28" />;
  }
  if (!load.recent?.length) return null;
  const max = Math.max(...load.weeks, 1);

  return (
    <section className="trening-panel space-y-3 rounded-[var(--tren-radius-card)] p-3.5" aria-label="Bieganie">
      <div className="flex items-center justify-between">
        <p className="flex items-center gap-1.5 text-2xs font-semibold tracking-normal text-text-muted">
          <Activity size={12} className="text-primary" /> Bieganie · obciążenie z tętna
        </p>
        <span className="text-2xs font-bold tabular-nums text-text-tertiary">
          {load.runs7}× · {formatKm(load.km7)} km · 7 dni
        </span>
      </div>

      <div className="flex items-end justify-between gap-4">
        <div className="min-w-0">
          <p className="text-4xl font-semibold tabular-nums leading-none text-text-primary">
            {load.load7}
            <span className="ml-1 text-base font-bold text-text-muted">pkt</span>
          </p>
          <p className="mt-1.5 text-sm font-semibold text-text-secondary">{load.verdict}</p>
          {load.avgWeeklyLoad != null && <p className="text-xs text-text-muted">zwykle {load.avgWeeklyLoad} pkt tygodniowo</p>}
        </div>
        <div className="flex h-16 shrink-0 items-end gap-1.5" role="img" aria-label={`Obciążenie w ostatnich czterech tygodniach: ${load.weeks.join(', ')}`}>
          {load.weeks.map((value, i) => (
            <div key={i} className="flex w-6 flex-col items-center gap-1">
              <div
                className={`w-full rounded-t-md ${i === 3 ? 'bg-primary' : 'bg-border-custom'}`}
                style={{ height: `${Math.max(4, Math.round((value / max) * 44))}px` }}
              />
              <span className="text-2xs text-text-muted">{i === 3 ? 'teraz' : `−${3 - i}`}</span>
            </div>
          ))}
        </div>
      </div>

      <ul className="space-y-1.5 border-t border-border-custom/60 pt-2.5">
        {load.recent.map((run) => (
          <li key={run.startedAt} className="flex items-center gap-2 text-xs">
            <span className="w-11 shrink-0 tabular-nums text-text-muted">{run.day.slice(5).replace('-', '.')}</span>
            <span className="min-w-0 flex-1 truncate font-semibold text-text-primary">
              {formatKm(run.km)} km · {run.minutes} min{run.avgHr ? ` · ${run.avgHr} bpm` : ''}
            </span>
            <span className={`shrink-0 rounded-full px-2 py-0.5 text-2xs font-bold ${INTENSITY_STYLE[run.intensity]}`}>{INTENSITY_LABEL[run.intensity]}</span>
            <span className="w-10 shrink-0 text-right font-semibold tabular-nums text-text-secondary">{run.load}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
