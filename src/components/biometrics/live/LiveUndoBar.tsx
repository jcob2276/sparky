import { useEffect } from 'react';
import { Pressable } from '../../ui/ControlPrimitives';

interface Props {
  message: string;
  onUndo: () => void;
  onExpire: () => void;
}

const UNDO_MS = 6000;

/** Pasek „Cofnij” po usunięciu serii lub ćwiczenia — znika sam po 6 s. */
export default function LiveUndoBar({ message, onUndo, onExpire }: Props) {
  useEffect(() => {
    const t = window.setTimeout(onExpire, UNDO_MS);
    return () => window.clearTimeout(t);
  }, [message, onExpire]);

  return (
    <div role="status" className="flex items-center gap-3 rounded-full border border-border-custom bg-surface-solid px-4 py-2 shadow-lg">
      <p className="min-w-0 flex-1 truncate text-sm font-semibold text-text-primary">{message}</p>
      <Pressable onClick={onUndo} className="h-10 shrink-0 rounded-full px-3 text-sm font-semibold text-primary">
        Cofnij
      </Pressable>
    </div>
  );
}
