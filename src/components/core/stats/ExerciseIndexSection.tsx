import { Pressable } from '../../ui/ControlPrimitives';
import { ChevronRight } from 'lucide-react';
import type { WorkoutSessionRow } from '../hooks/useStatsData';
import { collectRecentExerciseNames } from '../../../lib/health/exerciseProgress';

interface ExerciseIndexSectionProps {
  recentSessions: WorkoutSessionRow[];
  onOpenExercise: (name: string) => void;
}

export function ExerciseIndexSection({ recentSessions, onOpenExercise }: ExerciseIndexSectionProps) {
  const names = collectRecentExerciseNames(recentSessions, 14);
  if (!names.length) return null;

  return (
    <section className="space-y-3">
      <p className="text-2xs font-bold uppercase tracking-[var(--ds-arbitrary-0-15em)] text-text-muted font-display">
        Ćwiczenia
      </p>
      <h2 className="mt-0.5 font-display text-lg font-black tracking-tight text-text-primary">
        Progres per ćwiczenie
      </h2>
      <div className="card divide-y divide-border-custom !p-0 overflow-hidden">
        {names.map((name) => (
          <Pressable
            key={name}
            onClick={() => onOpenExercise(name)}
            className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left transition-colors hover:bg-primary/[0.03] cursor-pointer"
          >
            <span className="text-sm font-bold text-text-primary truncate">{name}</span>
            <ChevronRight size={16} className="shrink-0 text-text-muted" />
          </Pressable>
        ))}
      </div>
    </section>
  );
}
