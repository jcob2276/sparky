import { CheckCircle2, Dumbbell, Clock, Flame } from 'lucide-react';
import { Pressable } from '../../ui/ControlPrimitives';
import type { TodayWorkoutDetails } from '../../../lib/health/workoutApi';
import { formatWorkoutTonnage, normalizeSessionRpe } from '../../../lib/health/workoutDisplay';

interface TrainingTodayCardProps {
  details: TodayWorkoutDetails;
  onStartAnother: () => void;
  onLogSauna?: () => void;
}

export default function TrainingTodayCard({
  details,
  onStartAnother,
  onLogSauna,
}: TrainingTodayCardProps) {
  const tonnageLabel = formatWorkoutTonnage(details.totalTonnageKg) ?? '—';
  const rpe = normalizeSessionRpe(details.sessionRpe);

  return (
    <section className="trening-panel rounded-[var(--tren-radius-card)] p-3.5 space-y-3 border-primary/25">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary text-on-accent">
            <CheckCircle2 size={18} strokeWidth={2.5} />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-3xs font-black uppercase tracking-wider text-primary">
                Dziś zrobione
              </span>
              {rpe != null && (
                <span className="trening-chip px-1.5 py-0.5 text-3xs font-bold">RPE {rpe}</span>
              )}
            </div>
            <h2 className="text-lg font-black text-text-primary font-display mt-0.5 leading-tight truncate">
              {details.workoutDay}
            </h2>
          </div>
        </div>

        {details.startTime && details.endTime && (
          <div className="flex items-center gap-1 text-2xs font-bold text-text-muted shrink-0">
            <Clock size={12} />
            <span>
              {details.startTime.slice(11, 16)}–{details.endTime.slice(11, 16)}
            </span>
          </div>
        )}
      </div>

      <div className="grid grid-cols-3 gap-2">
        {(
          [
            ['Tonaż', tonnageLabel, true],
            ['Serie', String(details.totalSets), false],
            ['Ćwiczenia', String(details.exercises.length), false],
          ] as const
        ).map(([label, value, accent]) => (
          <div
            key={label}
            className="rounded-[var(--tren-radius-ctl)] bg-surface-1 px-2 py-2 text-center border border-border-custom/50"
          >
            <span className="text-3xs font-black uppercase tracking-wider text-text-muted block">
              {label}
            </span>
            <span
              className={`text-sm font-black font-mono mt-0.5 block ${
                accent ? 'text-primary' : 'text-text-primary'
              }`}
            >
              {value}
            </span>
          </div>
        ))}
      </div>

      {details.exercises.length > 0 && (
        <div className="space-y-1">
          {details.exercises.slice(0, 6).map((ex, i) => (
            <div
              key={`${ex.name}-${i}`}
              className="flex items-center justify-between text-xs py-1.5 px-2.5 rounded-xl bg-surface-1 border border-border-custom/35"
            >
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-text-muted font-mono text-3xs w-3">{i + 1}</span>
                <span className="font-bold text-text-primary truncate">{ex.name}</span>
              </div>
              <div className="flex items-center gap-2 text-2xs font-mono text-text-secondary shrink-0">
                <span>{ex.setsCount}×</span>
                {ex.bestKg > 0 && <span className="font-bold text-primary">{ex.bestKg}kg</span>}
              </div>
            </div>
          ))}
          {details.exercises.length > 6 && (
            <p className="text-3xs text-text-muted px-1">+{details.exercises.length - 6} więcej</p>
          )}
        </div>
      )}

      {details.notes && (
        <p className="text-xs text-text-secondary italic bg-surface-1 px-2.5 py-2 rounded-xl border border-border-custom/35">
          „{details.notes}”
        </p>
      )}

      <div className="flex gap-2 pt-0.5">
        <Pressable
          onClick={onStartAnother}
          className="flex-1 py-2.5 px-3 rounded-[var(--tren-radius-ctl)] border border-border-custom bg-surface-2 hover:border-primary/40 text-text-primary text-xs font-black uppercase tracking-wider ui-interactive flex items-center justify-center gap-1.5 cursor-pointer"
        >
          <Dumbbell size={13} /> Kolejna sesja
        </Pressable>
        {onLogSauna && (
          <Pressable
            onClick={onLogSauna}
            className="py-2.5 px-3 rounded-[var(--tren-radius-ctl)] border border-warning/30 bg-warning/10 hover:bg-warning/20 text-warning text-xs font-black uppercase tracking-wider ui-interactive flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <Flame size={13} /> Sauna
          </Pressable>
        )}
      </div>
    </section>
  );
}
