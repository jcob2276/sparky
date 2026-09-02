import { useMemo } from 'react';
import { Card } from '../../ui/Card';
import { buildHardSetsWeekly, topMuscleHardSets } from '../../../lib/health/trainingAnalytics';
import type { WorkoutSessionRow } from '../hooks/useStatsData';

interface MuscleHardSetsSectionProps {
  recentSessions: WorkoutSessionRow[];
}

const TAG_LABELS: Record<string, string> = {
  klatka: 'Klatka',
  plecy: 'Plecy',
  barki: 'Barki',
  biceps: 'Biceps',
  triceps: 'Triceps',
  czworogłowe: 'Czworogłowe',
  'dwugłowe ud': 'Dwugłowe',
  pośladki: 'Pośladki',
  nogi: 'Nogi',
  brzuch: 'Brzuch',
  łydki: 'Łydki',
  przedramiona: 'Przedramiona',
};

export function MuscleHardSetsSection({ recentSessions }: MuscleHardSetsSectionProps) {
  const buckets = useMemo(
    () => buildHardSetsWeekly(
      recentSessions.map((s) => ({
        date: s.date,
        session_rpe: s.session_rpe,
        exercise_logs: s.exercise_logs,
      })),
      4,
    ),
    [recentSessions],
  );

  const topMuscles = useMemo(() => topMuscleHardSets(buckets, 8), [buckets]);
  const maxWeekTotal = Math.max(...buckets.map((b) => b.total), 1);
  const currentWeek = buckets[buckets.length - 1];

  if (!topMuscles.length && !currentWeek?.total) {
    return null;
  }

  return (
    <Card variant="glass" className="border border-border-custom p-5 space-y-4">
      <div>
        <p className="text-2xs font-black uppercase tracking-widest text-text-muted">Hard sets</p>
        <h2 className="mt-1 font-display text-lg font-black tracking-tight text-text-primary">
          Bodziec na partię (4 tyg.)
        </h2>
        <p className="mt-1 text-2xs text-text-muted">Serie blisko failure (RIR ≤ 2), ważone bodźcem mięśnia</p>
      </div>

      <div className="flex items-end gap-2 h-16">
        {buckets.map((b, i) => {
          const h = Math.max(4, Math.round((b.total / maxWeekTotal) * 56));
          const isCurrent = i === buckets.length - 1;
          return (
            <div key={b.weekStart} className="flex-1 flex flex-col items-center gap-1">
              <div
                className={`w-full rounded-t-md ${isCurrent ? 'bg-primary/80' : 'bg-text-primary/15'}`}
                style={{ height: h }}
                title={`${b.total} hard sets`}
              />
              <span className="text-3xs font-bold text-text-muted">{b.label}</span>
            </div>
          );
        })}
      </div>

      <div className="space-y-2">
        {topMuscles.map((m) => (
          <div key={m.tag} className="flex items-center gap-2 text-xs">
            <span className="w-24 shrink-0 font-bold text-text-secondary truncate">
              {TAG_LABELS[m.tag] ?? m.tag}
            </span>
            <div className="flex-1 h-2 rounded-full bg-text-primary/10 overflow-hidden">
              <div
                className="h-full bg-primary/70 rounded-full"
                style={{ width: `${Math.min(100, (m.lastWeek / Math.max(currentWeek?.total ?? 1, 1)) * 100)}%` }}
              />
            </div>
            <span className="w-10 text-right font-black text-text-primary tabular-nums">
              {m.lastWeek.toFixed(1)}
            </span>
          </div>
        ))}
      </div>
    </Card>
  );
}
