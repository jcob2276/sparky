import { ChevronLeft } from 'lucide-react';
import { Pressable } from '../../ui/ControlPrimitives';
import { useHaptics } from '../../../hooks/useHaptics';

export function ExercisePickerNav({ onClose }: { onClose: () => void }) {
  const haptics = useHaptics();
  return (
    <div className="flex items-center justify-between pb-2.5 shrink-0 -mx-1">
      <Pressable
        onClick={() => {
          haptics.light();
          onClose();
        }}
        aria-label="Wróć do treningu"
        className="flex items-center gap-1 py-1.5 px-2 -ml-1 rounded-lg text-text-secondary hover:text-text-primary active:bg-surface-2 transition-colors cursor-pointer min-h-11"
      >
        <ChevronLeft size={20} />
        <span className="text-sm font-semibold">Wróć</span>
      </Pressable>

      <h2 className="text-base font-bold text-text-primary font-display">
        Wybierz ćwiczenie
      </h2>

      <Pressable
        onClick={() => {
          haptics.light();
          onClose();
        }}
        aria-label="Anuluj wybór ćwiczenia"
        className="text-sm font-semibold text-primary hover:text-primary-hover active:opacity-70 py-1.5 px-2 rounded-lg cursor-pointer min-h-11 flex items-center"
      >
        Anuluj
      </Pressable>
    </div>
  );
}

export function ExercisePickerCustomRow({ name, onPick }: { name: string; onPick: () => void }) {
  return (
    <Pressable
      type="button"
      onClick={onPick}
      className="tren-picker-row flex w-full items-center gap-3 border-b border-border-custom px-4 py-3 text-left ui-interactive"
    >
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-primary/30 bg-surface-tonal text-sm font-semibold text-primary">
        +
      </span>
      <span className="min-w-0">
        <span className="block text-base font-semibold text-text-primary">
          Użyj „{name}”
        </span>
        <span className="mt-0.5 block text-xs text-text-muted">Własna nazwa</span>
      </span>
    </Pressable>
  );
}
