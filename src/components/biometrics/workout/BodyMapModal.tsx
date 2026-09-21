import { useState, useMemo } from 'react';
import { Activity, Info, X } from 'lucide-react';
import Button from '../../ui/Button';
import IconButton from '../../ui/IconButton';
import BodyMap from './BodyMap';
import { MUSCLE_PL_NAMES, type SvgMuscle } from '../../../lib/health/bodyMuscles';
import type { WorkoutExercise } from '../../../lib/health/workout';

interface BodyMapModalProps {
  isOpen: boolean;
  onClose: () => void;
  exercises: WorkoutExercise[];
}

export default function BodyMapModal({
  isOpen,
  onClose,
  exercises,
}: BodyMapModalProps) {
  const [selectedMuscle, setSelectedMuscle] = useState<SvgMuscle | null>(null);

  const { fatigueByTag, tagToExercises } = useMemo(() => {
    const fatigue: Record<string, number> = {};
    const mapping: Record<string, string[]> = {};

    for (const ex of exercises) {
      if (!ex.name?.trim()) continue;
      const sets = ex.sets || [];
      const tonnage = sets.reduce((sum, s) => {
        const w = Number(s.kg) || 0;
        const r = Number(s.reps) || 0;
        return sum + (w * r);
      }, 0);

      const tags = ex.tags || [];
      for (const t of tags) {
        fatigue[t] = (fatigue[t] || 0) + (tonnage > 0 ? Math.min(1, tonnage / 2000) : 0.35);
        if (!mapping[t]) mapping[t] = [];
        if (!mapping[t].includes(ex.name)) mapping[t].push(ex.name);
      }
    }

    // Clamp fatigue to [0, 1]
    for (const k of Object.keys(fatigue)) {
      fatigue[k] = Math.min(1, Math.round(fatigue[k] * 100) / 100);
    }

    return { fatigueByTag: fatigue, tagToExercises: mapping };
  }, [exercises]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[var(--z-modal)] flex items-center justify-center p-4 bg-background/80 backdrop-blur-[var(--blur-md)] animate-in fade-in">
      <div className="bg-surface border border-border-custom rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-5 py-4 border-b border-border-custom flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-primary/10 text-primary border border-primary/20">
              <Activity size={18} />
            </div>
            <div>
              <h2 className="text-sm font-black uppercase tracking-wider text-text-primary">
                Anatomiczna Mapa Ciała
              </h2>
              <p className="text-3xs text-text-muted">
                Męska sylwetka · Poziomy zmęczenia sesji
              </p>
            </div>
          </div>
          <IconButton
            variant="ghost"
            size="sm"
            onClick={onClose}
            label="Zamknij"
            icon={<X size={18} />}
          />
        </div>

        {/* Content Body */}
        <div className="p-4 overflow-y-auto flex-1 space-y-4">
          <BodyMap
            fatigueByTag={fatigueByTag}
            selectedMuscle={selectedMuscle}
            onSelectMuscle={(m) => setSelectedMuscle(m)}
          />

          {/* Muscle Detail Card */}
          {selectedMuscle ? (
            <div className="rounded-2xl border border-primary/30 bg-primary/5 p-3.5 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black uppercase tracking-wider text-primary">
                  {MUSCLE_PL_NAMES[selectedMuscle]}
                </span>
                <span className="text-3xs font-bold px-2 py-0.5 rounded-md bg-surface border border-border-custom text-text-secondary">
                  Partia anatomiczna
                </span>
              </div>
              {tagToExercises[selectedMuscle]?.length ? (
                <div className="text-2xs text-text-secondary">
                  <span className="text-text-muted font-semibold">Ćwiczenia w sesji: </span>
                  {tagToExercises[selectedMuscle].join(', ')}
                </div>
              ) : (
                <div className="text-3xs text-text-muted">
                  Brak bezpośrednich ćwiczeń dla tej partii w bieżącej sesji.
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-2 p-3 rounded-2xl bg-surface-2/40 border border-border-custom/50 text-3xs text-text-muted">
              <Info size={14} className="shrink-0 text-text-muted/80" />
              <span>Dotknij dowolnej partii mięśniowej na sylwetce, aby sprawdzić ćwiczenia i zaangażowanie.</span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-border-custom bg-surface-2/30 flex justify-end">
          <Button
            type="button"
            onClick={onClose}
            variant="primary"
            size="sm"
          >
            Zamknij
          </Button>
        </div>
      </div>
    </div>
  );
}
