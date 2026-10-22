import { Delete } from 'lucide-react';
import type { KeypadKey } from '../../lib/finance/keypadInput';
import { Pressable } from '../ui/ControlPrimitives';

const ROWS: KeypadKey[][] = [
  ['1', '2', '3'],
  ['4', '5', '6'],
  ['7', '8', '9'],
  [',', '0', 'back'],
];

export function FinanceKeypad({ onKey }: { onKey: (key: KeypadKey) => void }) {
  return (
    <div className="grid grid-cols-3 gap-2" role="group" aria-label="Klawiatura kwoty">
      {ROWS.flat().map((key) => (
        <Pressable
          key={key}
          type="button"
          onClick={() => onKey(key)}
          aria-label={key === 'back' ? 'Usuń cyfrę' : key === ',' ? 'Przecinek' : key}
          className="flex h-14 items-center justify-center rounded-full bg-surface-2/80 text-2xl font-semibold tabular-nums text-text-primary transition-[transform,background-color] duration-[var(--motion-instant)] active:scale-[var(--scale-pressed-strong)] hover:bg-surface-2"
        >
          {key === 'back' ? <Delete size={22} aria-hidden="true" /> : key}
        </Pressable>
      ))}
    </div>
  );
}
