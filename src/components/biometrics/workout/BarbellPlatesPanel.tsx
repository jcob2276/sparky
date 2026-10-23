import { Minus } from 'lucide-react';
import { Pressable } from '../../ui/ControlPrimitives';
import { calculatePlates, BAR_PRESETS, STANDARD_PLATES } from '../../../lib/health/workoutPlateCalculator';
import { getPlateChipClass } from './plateStyles';
import BarbellSleeve from './BarbellSleeve';

interface Props {
  /** Ciężar całkowity serii w kg (ze sztangą); pusty tekst = sam gryf. */
  kg: string;
  onChange: (kg: string) => void;
  onClose: () => void;
}

const BAR_KG = BAR_PRESETS.olympic.weightKg;
const QUICK_PLATES = [...STANDARD_PLATES].reverse();

/** Inline barbell loader: visual plates on the sleeve + compact plate chips to add. */
export default function BarbellPlatesPanel({ kg, onChange, onClose }: Props) {
  const total = Math.max(BAR_KG, parseFloat(kg) || BAR_KG);
  const result = calculatePlates(total, 'olympic');
  const setTotal = (next: number) => onChange(String(Math.max(BAR_KG, Math.round(next * 100) / 100)));

  return (
    <div className="space-y-2.5 rounded-[var(--tren-radius-card,1.25rem)] border border-primary/20 bg-surface-1 p-2.5 animate-in fade-in shadow-[inset_0_1px_0_var(--tren-inset-glow)]">
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <p className="text-2xs font-semibold tracking-normal text-text-muted">
            Plate loader
          </p>
          <p className="mt-0.5 flex items-baseline gap-1 leading-none">
            <span className="text-2xl font-semibold tabular-nums tracking-tight text-primary">{total}</span>
            <span className="text-2xs font-bold text-text-muted">kg</span>
          </p>
          <p className="mt-1 text-2xs font-medium text-text-muted">
            Olympic {BAR_KG} · {result.weightPerSide} / side
          </p>
        </div>
        <Pressable
          onClick={onClose}
          className="shrink-0 rounded-lg px-2 py-1 text-2xs font-semibold text-text-muted hover:bg-surface-2 hover:text-text-primary"
        >
          Zwiń
        </Pressable>
      </div>

      <BarbellSleeve result={result} onRemovePlate={(plate) => setTotal(total - plate * 2)} />

      {result.remainder > 0 && (
        <p className="text-2xs text-warning">Zostaje {result.remainder} kg / strona poza standardem.</p>
      )}

      <div>
        <p className="mb-1.5 text-2xs font-semibold tracking-normal text-text-muted">
          Dołóż · obie strony
        </p>
        <div className="flex flex-wrap items-center gap-1.5">
          {QUICK_PLATES.map((plate) => (
            <Pressable
              key={plate}
              aria-label={`Dołóż talerz ${plate} kg na każdą stronę`}
              onClick={() => setTotal(total + plate * 2)}
              className={`flex shrink-0 items-center justify-center hover:brightness-110 active:scale-95 ${getPlateChipClass(plate)}`}
            >
              +{plate}
            </Pressable>
          ))}
          <Pressable
            aria-label="Sam gryf"
            onClick={() => setTotal(BAR_KG)}
            className="flex h-7 shrink-0 items-center justify-center gap-1 rounded-full border border-border-custom bg-surface-solid px-2.5 text-2xs font-semibold text-text-muted hover:border-primary/40 hover:text-primary"
          >
            <Minus size={10} strokeWidth={2.5} /> Gryf
          </Pressable>
        </div>
      </div>
    </div>
  );
}
