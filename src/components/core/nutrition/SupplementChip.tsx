import { useRef } from 'react';
import { Check, Plus } from 'lucide-react';
import { Pressable } from '../../ui/ControlPrimitives';
import { shortSupplementName } from '../../../lib/health/supplementLabels';
import type { Supplement } from '../../../lib/health/supplementsClient';

const LONG_PRESS_MS = 450;

interface Props {
  sup: Supplement;
  /** Liczba porcji z dziś; null gdy jeszcze niezażyty. */
  quantity: number | null;
  disabled: boolean;
  onToggle: () => void;
  /** Brak = stała porcja, bez wyboru liczby. */
  onLongPress?: () => void;
}

/** Chip suplementu: tap przełącza „zażyty”, przytrzymanie otwiera wybór liczby porcji. */
export default function SupplementChip({ sup, quantity, disabled, onToggle, onLongPress }: Props) {
  const timer = useRef<number | null>(null);
  const fired = useRef(false);
  const taken = quantity !== null;

  const cancel = () => {
    if (timer.current !== null) window.clearTimeout(timer.current);
    timer.current = null;
  };
  const start = () => {
    fired.current = false;
    cancel();
    if (!onLongPress) return;
    timer.current = window.setTimeout(() => {
      fired.current = true;
      onLongPress();
    }, LONG_PRESS_MS);
  };

  return (
    <Pressable
      type="button"
      aria-pressed={taken}
      aria-label={`${sup.name}: ${taken ? 'zażyty, kliknij aby cofnąć' : 'oznacz jako zażyty'}.${onLongPress ? ' Przytrzymaj, aby wybrać liczbę' : ''}`}
      disabled={disabled}
      haptic="none"
      onPointerDown={start}
      onPointerUp={cancel}
      onPointerLeave={cancel}
      onPointerCancel={cancel}
      onContextMenu={(event) => event.preventDefault()}
      onClick={() => {
        if (fired.current) {
          fired.current = false;
          return;
        }
        onToggle();
      }}
      className={`touch-manipulation flex min-h-9 items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-bold ui-interactive active:scale-95 disabled:opacity-60 ${
        taken
          ? 'border-success/40 bg-success/15 text-success'
          : 'border-border-custom bg-surface-solid/50 text-text-secondary hover:border-success/40'
      }`}
    >
      <span aria-hidden>{sup.emoji || '💊'}</span>
      <span>{shortSupplementName(sup)}</span>
      {taken && quantity > 1 && <span className="tabular-nums">×{quantity}</span>}
      {taken ? <Check size={12} strokeWidth={3} /> : <Plus size={12} className="opacity-60" />}
    </Pressable>
  );
}
