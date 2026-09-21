import { Pressable } from '../../ui/ControlPrimitives';

interface ExerciseCardToolbarProps {
  supersetGroup?: string;
  mode?: 'reps' | 'timed';
  daysAgo: number | null;
  onCycleSuperset: () => void;
  onToggleMode: () => void;
}

export function ExerciseCardToolbar({
  supersetGroup,
  mode,
  daysAgo,
  onCycleSuperset,
  onToggleMode,
}: ExerciseCardToolbarProps) {
  const readinessBadge = (() => {
    if (daysAgo == null) return null;
    if (daysAgo === 0) {
      return { label: 'Dziś (zmęczenie)', cls: 'bg-danger/10 text-danger border-danger/30' };
    }
    if (daysAgo === 1) {
      return { label: 'Odbudowa (wczoraj)', cls: 'bg-warning/10 text-warning border-warning/30' };
    }
    if (daysAgo === 2) {
      return { label: 'Regeneracja ~75%', cls: 'bg-warning/10 text-warning border-warning/30' };
    }
    if (daysAgo > 14) {
      return { label: 'Detrening (>14d)', cls: 'bg-surface-solid/50 text-text-muted border-border-custom' };
    }
    return { label: 'Gotowość (100%)', cls: 'bg-success/10 text-success border-success/30' };
  })();

  return (
    <div className="flex items-center gap-1.5 px-4 py-1.5 bg-surface/30 border-b border-border-custom/40 flex-wrap">
      <Pressable
        type="button"
        onClick={onCycleSuperset}
        className={`px-2 py-0.5 rounded-md text-3xs font-black uppercase tracking-wider transition-colors cursor-pointer border ${
          supersetGroup
            ? 'bg-primary/20 text-primary border-primary/40'
            : 'text-text-muted hover:text-text-secondary border-border-custom bg-surface/50'
        }`}
        title="Połącz ćwiczenia w superserię A, B, C (odpoczynek po pełnej rundzie)"
      >
        {supersetGroup ? `Superseria [${supersetGroup}]` : '+ Superseria'}
      </Pressable>

      <Pressable
        type="button"
        onClick={onToggleMode}
        className={`px-2 py-0.5 rounded-md text-3xs font-black uppercase tracking-wider transition-colors cursor-pointer border ${
          mode === 'timed'
            ? 'bg-warning/20 text-warning border-warning/40'
            : 'text-text-muted hover:text-text-secondary border-border-custom bg-surface/50'
        }`}
        title="Przełącz tryb serii: powtórzenia (reps) vs czas (izometria/plank/TUT)"
      >
        {mode === 'timed' ? '⏱ Czas (izometria)' : 'Powtórzenia'}
      </Pressable>

      {readinessBadge && (
        <span
          className={`text-3xs font-bold px-2 py-0.5 rounded-md border ml-auto ${readinessBadge.cls}`}
          title={`Ostatni trening: ${daysAgo}d temu. Biomechaniczny model rozpadu 36h.`}
        >
          {readinessBadge.label}
        </span>
      )}
    </div>
  );
}
