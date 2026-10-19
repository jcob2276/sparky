import { Minus, Plus } from 'lucide-react';
import { Pressable } from '../../ui/ControlPrimitives';
import { calculatePlates, BAR_PRESETS, STANDARD_PLATES } from '../../../lib/health/workoutPlateCalculator';
import { getPlateColorClass, getPlateHeightClass } from './plateStyles';

interface Props {
  /** Ciężar całkowity serii w kg (ze sztangą); pusty tekst = sam gryf. */
  kg: string;
  onChange: (kg: string) => void;
  onClose: () => void;
}

const BAR_KG = BAR_PRESETS.olympic.weightKg;
const QUICK_PLATES = [...STANDARD_PLATES].reverse();

/** Widok sztangi pod serią: talerze na jedną stronę gryfu i szybkie dokładanie jak w Bevel. */
export default function BarbellPlatesPanel({ kg, onChange, onClose }: Props) {
  const total = Math.max(BAR_KG, parseFloat(kg) || BAR_KG);
  const result = calculatePlates(total, 'olympic');
  const setTotal = (next: number) => onChange(String(Math.max(BAR_KG, Math.round(next * 100) / 100)));

  return (
    <div className="space-y-3 rounded-2xl border border-border-custom/60 bg-surface-2/50 p-3">
      <div className="flex items-center justify-between">
        <p className="text-sm font-black tabular-nums text-text-primary">{total} kg <span className="text-xs font-semibold text-text-muted">· gryf {BAR_KG} kg + {result.weightPerSide} kg na stronę</span></p>
        <Pressable onClick={onClose} className="px-2 text-xs font-semibold text-text-muted hover:text-text-primary">Zwiń</Pressable>
      </div>

      <div className="relative flex h-24 items-center overflow-x-auto rounded-xl bg-surface-3/40 px-3">
        <div className="absolute left-0 top-1/2 h-2.5 w-full -translate-y-1/2 bg-surface-raised" />
        <div className="relative mr-1.5 h-14 w-3 shrink-0 rounded-sm border border-border-custom bg-surface-raised" />
        <div className="relative flex items-center gap-1">
          {result.plates.length === 0 ? (
            <span className="text-xs font-medium text-text-muted">Sam gryf</span>
          ) : (
            result.plates.flatMap((p) =>
              Array.from({ length: p.count }, (_, i) => (
                <Pressable
                  key={`${p.plate}-${i}`}
                  aria-label={`Zdejmij talerz ${p.plate} kg`}
                  onClick={() => setTotal(total - p.plate * 2)}
                  className={`flex shrink-0 items-center justify-center rounded-md border text-3xs font-extrabold shadow-sm ${getPlateHeightClass(p.plate)} ${getPlateColorClass(p.plate)}`}
                >
                  {p.plate}
                </Pressable>
              )),
            )
          )}
        </div>
      </div>
      {result.remainder > 0 && <p className="text-xs text-warning">Zostaje {result.remainder} kg na stronę poza standardowymi talerzami.</p>}

      <div>
        <p className="mb-1.5 text-3xs font-black uppercase tracking-widest text-text-muted">Dołóż talerz (na każdą stronę)</p>
        <div className="flex gap-1.5 overflow-x-auto pb-1">
          {QUICK_PLATES.map((plate) => (
            <Pressable
              key={plate}
              aria-label={`Dołóż talerz ${plate} kg na każdą stronę`}
              onClick={() => setTotal(total + plate * 2)}
              className="flex h-11 min-w-11 shrink-0 items-center justify-center gap-0.5 rounded-full border border-border-custom bg-surface-solid px-3 text-sm font-bold text-text-primary hover:border-primary/50"
            >
              <Plus size={11} />{plate}
            </Pressable>
          ))}
          <Pressable
            aria-label="Sam gryf"
            onClick={() => setTotal(BAR_KG)}
            className="flex h-11 shrink-0 items-center justify-center gap-1 rounded-full border border-border-custom bg-surface-solid px-3 text-xs font-semibold text-text-muted"
          >
            <Minus size={11} /> Wyczyść
          </Pressable>
        </div>
      </div>
    </div>
  );
}
