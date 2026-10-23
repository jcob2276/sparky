import { X } from 'lucide-react';
import { Pressable } from '../../ui/ControlPrimitives';

interface Props {
  /** Zapas w powtórzeniach (RIR) zapisany w serii; RPE = 10 − RIR. */
  value: string;
  onPick: (rir: string, rpe: string) => void;
  onDismiss: () => void;
}

const OPTIONS = [
  { rpe: 6, label: 'Lekko' },
  { rpe: 7, label: 'Spokojnie' },
  { rpe: 8, label: 'Mocno' },
  { rpe: 9, label: 'Bardzo' },
  { rpe: 10, label: 'Upadek' },
];

/** Opcjonalna ocena serii skalą RPE (6–10): jedno stuknięcie, zapisuje też RIR. Pominięcie nic nie kosztuje. */
export default function LiveRirChips({ value, onPick, onDismiss }: Props) {
  const current = value.trim() === '' ? null : 10 - Number(value);
  return (
    <div className="mx-1 mb-1" role="group" aria-label="RPE serii">
      <div className="mb-1 flex items-center justify-between px-1">
        <p className="text-2xs font-bold tracking-normal text-text-muted">Jak ciężka? RPE</p>
        <Pressable onClick={onDismiss} aria-label="Pomiń ocenę serii" className="flex h-7 w-7 items-center justify-center rounded-full text-text-muted">
          <X size={14} />
        </Pressable>
      </div>
      <div className="grid grid-cols-5 gap-1.5">
        {OPTIONS.map((option) => (
          <Pressable
            key={option.rpe}
            onClick={() => onPick(String(10 - option.rpe), String(option.rpe))}
            aria-pressed={current === option.rpe}
            aria-label={`RPE ${option.rpe}, ${option.label}`}
            className={`flex h-12 flex-col items-center justify-center rounded-xl border ${
              current === option.rpe ? 'border-primary bg-primary/15 text-primary' : 'border-border-custom bg-surface-1 text-text-secondary'
            }`}
          >
            <span className="text-base font-semibold leading-none">{option.rpe}</span>
            <span className="mt-0.5 text-2xs font-semibold">{option.label}</span>
          </Pressable>
        ))}
      </div>
    </div>
  );
}
