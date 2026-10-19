import { useEffect, useState } from 'react';
import { Copy, Flame, Trash2 } from 'lucide-react';
import { Pressable } from '../../ui/ControlPrimitives';

interface Props {
  isWarmup: boolean;
  canDelete: boolean;
  onToggleWarmup: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
  onClose: () => void;
}

const CONFIRM_MS = 4000;

/** Akcje jednej serii. Usunięcie wymaga drugiego stuknięcia (samo wygasa po 4 s), a po usunięciu jest jeszcze „Cofnij”. */
export default function LiveSetActions({ isWarmup, canDelete, onToggleWarmup, onDuplicate, onDelete, onClose }: Props) {
  const [confirming, setConfirming] = useState(false);

  useEffect(() => {
    if (!confirming) return;
    const t = window.setTimeout(() => setConfirming(false), CONFIRM_MS);
    return () => window.clearTimeout(t);
  }, [confirming]);

  const base = 'flex h-11 flex-1 items-center justify-center gap-1.5 rounded-xl border text-xs font-bold';
  const neutral = `${base} border-border-custom bg-surface-1 text-text-secondary`;

  if (confirming) {
    return (
      <div className="mx-1 mb-1 flex gap-1.5" role="alertdialog" aria-label="Potwierdź usunięcie serii">
        <Pressable onClick={() => setConfirming(false)} className={neutral}>Anuluj</Pressable>
        <Pressable onClick={() => { setConfirming(false); onDelete(); }} className={`${base} border-danger bg-danger text-on-accent`}>
          <Trash2 size={15} /> Tak, usuń serię
        </Pressable>
      </div>
    );
  }

  return (
    <div className="mx-1 mb-1 flex gap-1.5" role="group" aria-label="Akcje serii">
      <Pressable onClick={() => { onToggleWarmup(); onClose(); }} className={neutral} aria-pressed={isWarmup}>
        <Flame size={15} className="text-warning" /> {isWarmup ? 'Robocza' : 'Rozgrzewka'}
      </Pressable>
      <Pressable onClick={() => { onDuplicate(); onClose(); }} className={neutral}>
        <Copy size={15} /> Duplikuj
      </Pressable>
      <Pressable
        onClick={() => setConfirming(true)}
        disabled={!canDelete}
        aria-label={canDelete ? 'Usuń serię' : 'Nie można usunąć jedynej serii'}
        className={`${neutral} ${canDelete ? '!text-danger' : 'opacity-40'}`}
      >
        <Trash2 size={15} /> Usuń
      </Pressable>
    </div>
  );
}
