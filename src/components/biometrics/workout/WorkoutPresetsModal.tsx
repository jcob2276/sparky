import { useState } from 'react';
import { X, ArrowUpDown, ArrowLeftRight, Plus, Check } from 'lucide-react';
import Button from '../../ui/Button';
import { WORKOUT_PRESETS, type WorkoutPreset } from './workoutPresets';

interface WorkoutPresetsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApplyPreset: (preset: WorkoutPreset) => void;
}

export default function WorkoutPresetsModal({
  isOpen,
  onClose,
  onApplyPreset,
}: WorkoutPresetsModalProps) {
  const [selectedCategory, setSelectedCategory] = useState<'all' | 'wertykalne' | 'horyzontalne' | 'plyo'>('all');
  const [appliedId, setAppliedId] = useState<string | null>(null);

  if (!isOpen) return null;

  const filtered = selectedCategory === 'all'
    ? WORKOUT_PRESETS
    : WORKOUT_PRESETS.filter((p) => p.category === selectedCategory || (selectedCategory === 'wertykalne' && p.direction === 'vertical'));

  const handleApply = (preset: WorkoutPreset) => {
    setAppliedId(preset.id);
    onApplyPreset(preset);
    setTimeout(() => {
      onClose();
      setAppliedId(null);
    }, 300);
  };

  return (
    <div className="fixed inset-0 z-[var(--z-modal)] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-xs p-0 sm:p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-lg max-h-[85vh] flex flex-col rounded-t-3xl sm:rounded-3xl border border-border-custom bg-background shadow-2xl overflow-hidden">
        {/* Header */}
        <header className="flex items-center justify-between border-b border-border-custom px-5 py-4">
          <div>
            <h2 className="text-sm font-black uppercase tracking-wider text-text-primary">
              Gotowe Zestawy Treningowe
            </h2>
            <p className="text-2xs font-semibold text-text-muted mt-0.5">
              Płaszczyzny ruchu, rekomendowane połączenia i pełna edycja
            </p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            aria-label="Zamknij"
            className="!p-1.5 !rounded-full text-text-muted hover:text-text-primary"
          >
            <X size={18} />
          </Button>
        </header>

        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 px-5 py-2.5 border-b border-border-custom/50 overflow-x-auto bg-surface/30">
          {[
            { id: 'all', label: 'Wszystkie' },
            { id: 'wertykalne', label: '↕ Wertykalne' },
            { id: 'horyzontalne', label: '↔ Horyzontalne' },
            { id: 'plyo', label: '⚡ Pliometria' },
          ].map((tab) => (
            <Button
              key={tab.id}
              variant={selectedCategory === tab.id ? 'primary' : 'secondary'}
              size="sm"
              onClick={() => setSelectedCategory(tab.id as typeof selectedCategory)}
              className="!px-3 !py-1 !rounded-full text-2xs font-bold shrink-0"
            >
              {tab.label}
            </Button>
          ))}
        </div>

        {/* Presets List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {filtered.map((preset) => {
            const isVert = preset.direction === 'vertical';
            const isApplied = appliedId === preset.id;
            return (
              <div
                key={preset.id}
                className="rounded-2xl border border-border-custom/80 bg-surface/50 p-4 space-y-3 hover:border-primary/40 transition-colors"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-3xs font-black uppercase tracking-wider ${
                        isVert
                          ? 'bg-info/10 text-info border border-info/20'
                          : 'bg-warning/10 text-warning border border-warning/20'
                      }`}>
                        {isVert ? <ArrowUpDown size={10} /> : <ArrowLeftRight size={10} />}
                        {preset.categoryLabel}
                      </span>
                    </div>
                    <h3 className="text-sm font-black text-text-primary mt-1">
                      {preset.name}
                    </h3>
                  </div>
                  <Button
                    variant={isApplied ? 'primary' : 'outline'}
                    size="sm"
                    onClick={() => handleApply(preset)}
                    className="shrink-0 text-2xs font-black uppercase tracking-wider"
                  >
                    {isApplied ? <Check size={13} /> : <Plus size={13} />}
                    {isApplied ? 'Dodano' : 'Wstaw'}
                  </Button>
                </div>

                <p className="text-xs text-text-secondary leading-relaxed">
                  {preset.description}
                </p>

                {/* Recommended pairing note */}
                <div className="rounded-xl border border-border-custom/50 bg-surface-solid/40 p-2 text-2xs text-text-muted flex items-start gap-1.5">
                  <span className="text-primary font-bold shrink-0">Polecane połączenie:</span>
                  <span>{preset.recommendedWith}</span>
                </div>

                {/* Exercise list preview */}
                <div className="space-y-1 pt-1 border-t border-border-custom/30">
                  {preset.exercises.map((ex, i) => (
                    <div key={i} className="flex items-center justify-between text-2xs text-text-muted">
                      <span className="font-semibold text-text-secondary truncate">{ex.name}</span>
                      <span className="shrink-0 font-mono text-3xs opacity-80">{ex.defaultSets.length} serie</span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
