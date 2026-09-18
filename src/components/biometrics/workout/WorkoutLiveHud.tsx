import { Pressable } from '../../ui/ControlPrimitives';
import { Timer, Dumbbell, CheckCircle2 } from 'lucide-react';
import type { SessionVolumeStats } from './workoutUtils';

interface WorkoutLiveHudProps {
  stats: SessionVolumeStats;
  elapsed: string | null;
  timerActive: boolean;
  showRestTimer: boolean;
  onToggleTimer: () => void;
  onToggleRestTimer: () => void;
}

export default function WorkoutLiveHud({
  stats,
  elapsed,
  timerActive,
  showRestTimer,
  onToggleTimer,
  onToggleRestTimer,
}: WorkoutLiveHudProps) {
  return (
    <div className="bg-surface/80 border border-border-custom backdrop-blur-md rounded-2xl p-3 shadow-xs transition-all">
      <div className="flex items-center justify-between gap-2">
        {/* Timer / Status */}
        <Pressable
          onClick={onToggleTimer}
          className="flex items-center gap-2 px-2.5 py-1.5 rounded-xl bg-surface-solid border border-border-custom/80 hover:border-primary/40 transition-colors cursor-pointer"
          title={timerActive ? 'Zatrzymaj stoper sesji' : 'Rozpocznij stoper sesji'}
        >
          <div className={`w-2 h-2 rounded-full ${timerActive ? 'bg-success animate-pulse' : 'bg-text-muted/40'}`} />
          <span className="text-xs font-mono font-black text-text-primary tabular-nums">
            {elapsed || '00:00'}
          </span>
        </Pressable>

        {/* Live Tonnage & BW Badge */}
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-primary/10 border border-primary/20">
          <Dumbbell size={13} className="text-primary shrink-0" />
          <div className="flex items-baseline gap-1">
            <span className="text-xs font-black text-text-primary tabular-nums">
              {stats.tonnage > 0 ? stats.tonnage.toLocaleString() : '0'}
            </span>
            <span className="text-3xs font-black uppercase text-primary">kg</span>
            {stats.bwReps > 0 && (
              <span className="text-3xs font-bold text-text-secondary ml-1">
                · {stats.bwReps} BW
              </span>
            )}
          </div>
        </div>

        {/* Completed Sets */}
        <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-surface-solid border border-border-custom/80">
          <CheckCircle2 size={12} className="text-success shrink-0" />
          <span className="text-xs font-bold text-text-primary tabular-nums">
            {stats.completedSets}
          </span>
          <span className="text-3xs font-bold text-text-muted uppercase">serii</span>
        </div>

        {/* Rest Timer Quick Toggle */}
        <Pressable
          onClick={onToggleRestTimer}
          className={`p-2 rounded-xl border transition-all cursor-pointer ${
            showRestTimer
              ? 'bg-warning/20 border-warning/50 text-warning scale-105 shadow-xs'
              : 'bg-surface-solid border-border-custom text-text-muted hover:text-text-primary hover:border-border-hover'
          }`}
          title="Stoper przerw między seriami"
        >
          <Timer size={14} />
        </Pressable>
      </div>
    </div>
  );
}
