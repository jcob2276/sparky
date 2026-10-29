import { useEffect, useRef } from 'react';
import { Flame, Scale, Trash2, Minus, Repeat2 } from 'lucide-react';
import { Pressable } from '../../ui/ControlPrimitives';

interface Props {
  canPlates: boolean;
  onClose: () => void;
  onWarmup: () => void;
  onPlates: () => void;
  onRemoveSet: () => void;
  onSwap?: () => void;
  onRemove: () => void;
}

const TRIGGER_SELECTOR = '[aria-label="Więcej opcji ćwiczenia"]';

/** Rzadko potrzebne akcje ćwiczenia schowane w jednym menu, żeby karta zostawała prosta. */
export default function LiveExerciseMenu({ canPlates, onClose, onWarmup, onPlates, onRemoveSet, onSwap, onRemove }: Props) {
  const ref = useRef<HTMLDivElement>(null);

  // Zamykanie po stuknięciu obok i klawiszem Esc — bez nakładki na cały ekran, która przykrywała pozycje menu.
  useEffect(() => {
    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as Element | null;
      if (!target || ref.current?.contains(target) || target.closest(TRIGGER_SELECTOR)) return;
      onClose();
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('pointerdown', onPointerDown, true);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown, true);
      document.removeEventListener('keydown', onKey);
    };
  }, [onClose]);

  const item = 'flex h-11 w-full items-center gap-2.5 rounded-xl px-3 text-left text-sm font-semibold text-text-primary hover:bg-surface-2';
  const run = (action: () => void) => () => {
    onClose();
    action();
  };
  return (
    <div ref={ref} role="menu" className="absolute right-0 top-11 z-[var(--z-modal)] w-56 rounded-2xl border border-border-custom bg-surface-solid p-1.5 shadow-lg">
      <Pressable role="menuitem" onClick={run(onWarmup)} className={item}><Flame size={16} className="text-warning" /> Dodaj rozgrzewkę</Pressable>
      {canPlates && <Pressable role="menuitem" onClick={run(onPlates)} className={item}><Scale size={16} className="text-primary" /> Talerze na sztandze</Pressable>}
      <Pressable role="menuitem" onClick={run(onRemoveSet)} className={item}><Minus size={16} className="text-text-muted" /> Usuń ostatnią serię</Pressable>
      {onSwap && <Pressable role="menuitem" onClick={run(onSwap)} className={item}><Repeat2 size={16} className="text-primary" /> Zamień ćwiczenie</Pressable>}
      <Pressable role="menuitem" onClick={run(onRemove)} className={`${item} !text-danger`}><Trash2 size={16} /> Usuń ćwiczenie</Pressable>
    </div>
  );
}
