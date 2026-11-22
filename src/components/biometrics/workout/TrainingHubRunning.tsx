import { useState } from 'react';
import Skeleton from '../../ui/Skeleton';
import { Activity, ChevronDown, ChevronUp } from 'lucide-react';
import { Pressable } from '../../ui/ControlPrimitives';
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
  const [showRecent, setShowRecent] = useState(false);

  if (loading || !load) {
    return <Skeleton variant="block" className="h-28" />;
  }
  if (!load.recent?.length) return null;
  const max = Math.max(...load.weeks, 1);
  const isZeroWeek = load.runs7 === 0;

  return (
    <section className="trening-panel space-y-3 rounded-[var(--tren-radius-card)] p-3.5 border-border-custom/60" aria-label="Bieganie">
      <div className="flex items-center justify-between">
        <p className="flex items-center gap-1.5 text-2xs font-bold uppercase tracking-wider text-text-muted">
          <Activity size={13} className="text-primary" /> Kardio · obciążenie biegowe
        </p>
        <span className="text-2xs font-bold tabular-nums text-text-tertiary">
          {load.runs7}× · {formatKm(load.km7)} km · 7 dni
        </span>
      </div>

      <div className="flex items-end justify-between gap-4">
        <div className="min-w-0">
          <div className="flex items-baseline gap-1.5">
            <span className="text-3xl font-bold tabular-nums leading-none text-text-primary font-mono">
              {load.load7}
            </span>
            <span className="text-xs font-bold text-text-muted">pkt obciążenia</span>
          </div>
          <p className="mt-1 text-xs font-semibold text-text-secondary">{load.verdict}</p>
          {load.avgWeeklyLoad != null && (
            <p className="text-2xs text-text-muted">średnia tygodniowa: {load.avgWeeklyLoad} pkt</p>
          )}
        </div>
        <div className="flex h-14 shrink-0 items-end gap-1.5" role="img" aria-label={`Obciążenie w ostatnich czterech tygodniach: ${load.weeks.join(', ')}`}>
          {load.weeks.map((value, i) => (
            <div key={i} className="flex w-5 flex-col items-center gap-1">
              <div
                className={`w-full rounded-t-sm transition-all ${i === 3 ? 'bg-primary' : 'bg-surface-3'}`}
                style={{ height: `${Math.max(4, Math.round((value / max) * 38))}px` }}
              />
              <span className="text-2xs font-mono text-text-muted">{i === 3 ? 'teraz' : `−${3 - i}`}</span>
            </div>
          ))}
        </div>
      </div>

      {load.recent.length > 0 && (
        <div className="border-t border-border-custom/40 pt-2">
          {isZeroWeek ? (
            <div>
              <Pressable
                onClick={() => setShowRecent((prev) => !prev)}
                className="w-full flex items-center justify-between py-1 text-2xs font-semibold text-text-muted hover:text-text-secondary transition-colors cursor-pointer"
              >
                <span>Historia poprzednich biegów ({load.recent.length})</span>
                {showRecent ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
              </Pressable>
              {showRecent && (
                <ul className="space-y-1.5 pt-2">
                  {load.recent.map((run) => (
                    <li key={run.startedAt} className="flex items-center gap-2 text-xs py-1 px-1.5 rounded-md bg-surface-1">
                      <span className="w-10 shrink-0 tabular-nums text-text-muted font-mono text-2xs">{run.day.slice(5).replace('-', '.')}</span>
                      <span className="min-w-0 flex-1 truncate font-medium text-text-primary text-2xs">
                        {formatKm(run.km)} km · {run.minutes} min{run.avgHr ? ` · ${run.avgHr} bpm` : ''}
                      </span>
                      <span className={`shrink-0 rounded-full px-1.5 py-0.2 text-2xs font-bold ${INTENSITY_STYLE[run.intensity]}`}>{INTENSITY_LABEL[run.intensity]}</span>
                      <span className="w-8 shrink-0 text-right font-mono font-semibold tabular-nums text-text-secondary text-2xs">{run.load}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ) : (
            <ul className="space-y-1.5">
              {load.recent.map((run) => (
                <li key={run.startedAt} className="flex items-center gap-2 text-xs py-1 px-1.5 rounded-md bg-surface-1">
                  <span className="w-10 shrink-0 tabular-nums text-text-muted font-mono text-2xs">{run.day.slice(5).replace('-', '.')}</span>
                  <span className="min-w-0 flex-1 truncate font-medium text-text-primary text-2xs">
                    {formatKm(run.km)} km · {run.minutes} min{run.avgHr ? ` · ${run.avgHr} bpm` : ''}
                  </span>
                  <span className={`shrink-0 rounded-full px-1.5 py-0.2 text-2xs font-bold ${INTENSITY_STYLE[run.intensity]}`}>{INTENSITY_LABEL[run.intensity]}</span>
                  <span className="w-8 shrink-0 text-right font-mono font-semibold tabular-nums text-text-secondary text-2xs">{run.load}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </section>
  );
}
