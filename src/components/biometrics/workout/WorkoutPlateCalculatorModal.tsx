/**
 * @file WorkoutPlateCalculatorModal.tsx
 * @role Full-screen barbell plate calculator with realistic sleeve graphic.
 */

import { useState } from 'react';
import { Plus, Minus, Info } from 'lucide-react';
import Modal from '../../ui/Modal';
import Button from '../../ui/Button';
import {
  calculatePlates,
  BAR_PRESETS,
  STANDARD_PLATES,
  type BarType,
  type PlateCalculationResult,
} from '../../../lib/health/workoutPlateCalculator';
import { getPlateChipClass } from './plateStyles';
import BarbellSleeve from './BarbellSleeve';
import { Pressable } from '../../ui/ControlPrimitives';

interface WorkoutPlateCalculatorModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialWeightKg?: number;
  onApplyWeight?: (weight: number) => void;
}

const BAR_TYPES: BarType[] = ['olympic', 'ez', 'smith', 'trap'];

const NUDGES = [
  { delta: -10, label: '10 kg', aria: 'Odejmij 10 kg' },
  { delta: -2.5, label: '2.5 kg', aria: 'Odejmij 2.5 kg' },
  { delta: 2.5, label: '2.5 kg', aria: 'Dodaj 2.5 kg' },
  { delta: 10, label: '10 kg', aria: 'Dodaj 10 kg' },
];

export function WorkoutPlateCalculatorModal({
  isOpen,
  onClose,
  initialWeightKg = 80,
  onApplyWeight,
}: WorkoutPlateCalculatorModalProps) {
  const [totalWeight, setTotalWeight] = useState<number>(initialWeightKg);
  const [barType, setBarType] = useState<BarType>('olympic');
  const [prevProps, setPrevProps] = useState({ isOpen, initialWeightKg });

  if (isOpen !== prevProps.isOpen || initialWeightKg !== prevProps.initialWeightKg) {
    setPrevProps({ isOpen, initialWeightKg });
    if (isOpen) {
      setTotalWeight(initialWeightKg);
    }
  }

  const result: PlateCalculationResult = calculatePlates(totalWeight, barType);
  const bar = BAR_PRESETS[barType];
  const quickPlates = [...STANDARD_PLATES].reverse();

  const setTotal = (next: number) =>
    setTotalWeight(Math.max(bar.weightKg, Math.round(next * 100) / 100));

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Talerze na sztangę"
      className="trening-theme !bg-surface !text-text-primary !border-border-custom"
    >
      <div className="space-y-3.5 p-1 text-text-primary">
        <div className="flex flex-col items-center rounded-[var(--tren-radius-card,1.25rem)] border border-primary/20 bg-surface-1 px-3 py-3.5 shadow-[inset_0_1px_0_var(--tren-inset-glow)]">
          <span className="text-2xs font-semibold tracking-normal text-text-muted">
            Ciężar całkowity
          </span>
          <div className="my-1 flex items-baseline gap-1">
            <span className="text-4xl font-semibold tracking-tight tabular-nums text-primary">{totalWeight}</span>
            <span className="text-sm font-bold text-text-muted">kg</span>
          </div>
          <p className="text-2xs text-text-muted">
            {bar.name} {bar.weightKg} kg · {result.weightPerSide} kg na stronę
          </p>
        </div>

        <div className="space-y-1.5">
          <label className="text-2xs font-semibold tracking-normal text-text-muted">
            Gryf
          </label>
          <div className="grid grid-cols-2 gap-1 sm:grid-cols-4">
            {BAR_TYPES.map((type) => {
              const p = BAR_PRESETS[type];
              const isSelected = barType === type;
              return (
                <Pressable
                  key={type}
                  onClick={() => {
                    setBarType(type);
                    if (totalWeight < p.weightKg) setTotalWeight(p.weightKg);
                  }}
                  className={`rounded-[var(--tren-radius-ctl,0.75rem)] border px-2 py-1.5 text-left transition-colors ${
                    isSelected
                      ? 'border-primary/50 bg-surface-tonal text-primary'
                      : 'border-border-custom bg-surface-solid text-text-secondary hover:border-primary/30 hover:text-text-primary'
                  }`}
                >
                  <span className="block text-2xs font-bold leading-tight">{p.name}</span>
                  <span className="mt-0.5 block text-2xs text-text-muted">{p.weightKg} kg</span>
                </Pressable>
              );
            })}
          </div>
        </div>

        <BarbellSleeve
          result={result}
          onRemovePlate={(plate) => setTotal(totalWeight - plate * 2)}
        />

        {result.plates.length > 0 && (
          <p className="text-center text-2xs text-text-secondary">
            Na każdą stronę:{' '}
            <strong className="font-semibold text-text-primary">
              {result.plates.flatMap((p) => Array(p.count).fill(`${p.plate} kg`)).join(' + ')}
            </strong>
          </p>
        )}

        {result.remainder > 0 && (
          <div className="flex items-center gap-2 rounded-xl border border-warning/25 bg-warning/10 p-2 text-2xs text-warning">
            <Info size={12} className="shrink-0" />
            <span>Pozostało {result.remainder} kg / strona poza standardem.</span>
          </div>
        )}

        <div>
          <p className="mb-1.5 text-2xs font-semibold tracking-normal text-text-muted">
            Dołóż talerz (obie strony)
          </p>
          <div className="flex flex-wrap gap-1.5">
            {quickPlates.map((plate) => (
              <Pressable
                key={plate}
                aria-label={`Dołóż talerz ${plate} kg na każdą stronę`}
                onClick={() => setTotal(totalWeight + plate * 2)}
                className={`flex items-center justify-center hover:brightness-110 active:scale-95 ${getPlateChipClass(plate)}`}
              >
                +{plate}
              </Pressable>
            ))}
          </div>
          <div className="mt-2 flex flex-wrap gap-1">
            {NUDGES.map((nudge) => (
              <Button
                key={nudge.label}
                variant="outline"
                size="sm"
                onClick={() => setTotal(totalWeight + nudge.delta)}
                className="!h-7 !px-2 !text-2xs"
                aria-label={nudge.aria}
              >
                {nudge.delta < 0 ? <Minus size={10} /> : <Plus size={10} />} {nudge.label}
              </Button>
            ))}
            <Button variant="outline" size="sm" onClick={() => setTotal(bar.weightKg)} className="!h-7 !px-2 !text-2xs">
              Sam gryf
            </Button>
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-0.5">
          <Button variant="secondary" onClick={onClose}>
            Zamknij
          </Button>
          {onApplyWeight && (
            <Button
              variant="primary"
              onClick={() => {
                onApplyWeight(totalWeight);
                onClose();
              }}
            >
              Wstaw {totalWeight} kg
            </Button>
          )}
        </div>
      </div>
    </Modal>
  );
}
