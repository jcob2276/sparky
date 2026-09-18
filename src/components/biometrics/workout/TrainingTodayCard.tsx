import { CheckCircle2, Dumbbell, Clock, Flame } from 'lucide-react';
import { Card } from '../../ui/Card';
import { Pressable } from '../../ui/ControlPrimitives';
import type { TodayWorkoutDetails } from '../../../lib/health/workoutApi';

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
  const tonnageMg = (details.totalTonnageKg / 1000).toFixed(1);

  return (
    <Card variant="surface" className="border border-success/30 bg-success/5 space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-success/15 text-success">
            <CheckCircle2 size={18} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-3xs font-black uppercase tracking-wider text-success">
                Trening Zrobiony
              </span>
              {details.sessionRpe != null && (
                <span className="text-3xs font-bold text-text-muted bg-surface px-1.5 py-0.5 rounded border border-border-custom">
                  RPE {details.sessionRpe}
                </span>
              )}
            </div>
            <h2 className="text-base font-black text-text-primary font-display mt-0.5">
              {details.workoutDay}
            </h2>
          </div>
        </div>

        {details.startTime && details.endTime && (
          <div className="flex items-center gap-1 text-2xs font-bold text-text-muted">
            <Clock size={12} />
            <span>
              {details.startTime.slice(11, 16)} – {details.endTime.slice(11, 16)}
            </span>
          </div>
        )}
      </div>

      {/* Glanceable Metrics */}
      <div className="grid grid-cols-3 gap-2 pt-1 border-t border-border-custom/40">
        <div className="bg-surface/60 rounded-xl p-2.5 text-center border border-border-custom/50">
          <span className="text-3xs font-black uppercase tracking-wider text-text-muted block">Tonaż</span>
          <span className="text-sm font-black text-primary font-mono">{tonnageMg} Mg</span>
        </div>
        <div className="bg-surface/60 rounded-xl p-2.5 text-center border border-border-custom/50">
          <span className="text-3xs font-black uppercase tracking-wider text-text-muted block">Serie</span>
          <span className="text-sm font-black text-text-primary font-mono">{details.totalSets}</span>
        </div>
        <div className="bg-surface/60 rounded-xl p-2.5 text-center border border-border-custom/50">
          <span className="text-3xs font-black uppercase tracking-wider text-text-muted block">Ćwiczenia</span>
          <span className="text-sm font-black text-text-primary font-mono">{details.exercises.length}</span>
        </div>
      </div>

      {/* Exercise list summary */}
      {details.exercises.length > 0 && (
        <div className="space-y-1.5 pt-1">
          <span className="text-3xs font-black uppercase tracking-wider text-text-muted">
            Wykonane ćwiczenia:
          </span>
          <div className="space-y-1">
            {details.exercises.map((ex, i) => (
              <div
                key={i}
                className="flex items-center justify-between text-xs py-1 px-2.5 rounded-lg bg-surface/40 border border-border-custom/40"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-text-muted font-mono text-3xs">{i + 1}.</span>
                  <span className="font-bold text-text-primary truncate">{ex.name}</span>
                </div>
                <div className="flex items-center gap-2 text-2xs font-mono text-text-secondary shrink-0">
                  <span>{ex.setsCount} ser.</span>
                  {ex.bestKg > 0 && <span className="font-bold text-primary">max {ex.bestKg}kg</span>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {details.notes && (
        <div className="text-xs text-text-secondary italic bg-surface/40 p-2.5 rounded-xl border border-border-custom/40">
          „{details.notes}”
        </div>
      )}

      {/* Bottom Actions */}
      <div className="flex gap-2 pt-2">
        <Pressable
          onClick={onStartAnother}
          className="flex-1 py-2.5 px-3 rounded-xl border border-border-custom bg-surface hover:bg-surface-solid text-text-primary text-xs font-black uppercase tracking-wider ui-interactive flex items-center justify-center gap-1.5 cursor-pointer"
        >
          <Dumbbell size={13} /> Kolejna sesja
        </Pressable>
        {onLogSauna && (
          <Pressable
            onClick={onLogSauna}
            className="py-2.5 px-3 rounded-xl border border-warning/30 bg-warning/10 hover:bg-warning/20 text-warning text-xs font-black uppercase tracking-wider ui-interactive flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <Flame size={13} /> Sauna / Reg.
          </Pressable>
        )}
      </div>
    </Card>
  );
}
