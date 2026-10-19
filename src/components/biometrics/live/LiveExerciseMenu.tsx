import { Flame, Scale, TrendingUp, Trash2, Minus, Repeat2 } from 'lucide-react';
import { Pressable } from '../../ui/ControlPrimitives';

interface Props {
  canPlates: boolean;
  onClose: () => void;
  onWarmup: () => void;
  onPlates: () => void;
  onProgress: () => void;
  onRemoveSet: () => void;
  onSwap?: () => void;
  onRemove: () => void;
}

/** Rzadko potrzebne akcje ćwiczenia schowane w jednym menu, żeby karta zostawała prosta. */
export default function LiveExerciseMenu({ canPlates, onClose, onWarmup, onPlates, onProgress, onRemoveSet, onSwap, onRemove }: Props) {
  const item = 'flex h-11 w-full items-center gap-2.5 rounded-xl px-3 text-left text-sm font-semibold text-text-primary hover:bg-surface-2';
  const run = (action: () => void) => () => {
    onClose();
    action();
  };
  return (
    <>
      <Pressable aria-label="Zamknij menu" onClick={onClose} className="fixed inset-0 z-[var(--z-overlay)] cursor-default" />
      <div role="menu" className="absolute right-0 top-11 z-[var(--z-modal)] w-56 rounded-2xl border border-border-custom bg-surface-solid p-1.5 shadow-lg">
        <Pressable role="menuitem" onClick={run(onWarmup)} className={item}><Flame size={16} className="text-warning" /> Dodaj rozgrzewkę</Pressable>
        {canPlates && <Pressable role="menuitem" onClick={run(onPlates)} className={item}><Scale size={16} className="text-primary" /> Talerze na sztandze</Pressable>}
        <Pressable role="menuitem" onClick={run(onProgress)} className={item}><TrendingUp size={16} className="text-primary" /> Historia i progres</Pressable>
        <Pressable role="menuitem" onClick={run(onRemoveSet)} className={item}><Minus size={16} className="text-text-muted" /> Usuń ostatnią serię</Pressable>
        {onSwap && <Pressable role="menuitem" onClick={run(onSwap)} className={item}><Repeat2 size={16} className="text-primary" /> Zamień ćwiczenie</Pressable>}
        <Pressable role="menuitem" onClick={run(onRemove)} className={`${item} !text-danger`}><Trash2 size={16} /> Usuń ćwiczenie</Pressable>
      </div>
    </>
  );
}
