/**
 * @file WorkoutPlateCalculatorModal.tsx
 * @role Wizualny kalkulator talerzy na sztangę (Barbell Plate Calculator) w stylu Bevel Health / Strong.
 * Rysuje gryf olimpijski i rozkład obciążenia na stronę dla zadanego ciężaru.
 */

import { useState } from 'react';
import { Plus, Minus, Info } from 'lucide-react';
import Modal from '../../ui/Modal';
import Button from '../../ui/Button';
import {
  calculatePlates,
  BAR_PRESETS,
  type BarType,
  type PlateCalculationResult,
} from '../../../lib/health/workoutPlateCalculator';

interface WorkoutPlateCalculatorModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialWeightKg?: number;
  onApplyWeight?: (weight: number) => void;
}

const getPlateColorClass = (plate: number) => {
  switch (plate) {
    case 25:
      return 'bg-danger text-white border-danger/40';
    case 20:
      return 'bg-info text-white border-info/40';
    case 15:
      return 'bg-warning text-black border-warning/40';
    case 10:
      return 'bg-success text-white border-success/40';
    case 5:
      return 'bg-surface-3 text-text-primary border-border-custom';
    case 2.5:
      return 'bg-surface-2 text-text-primary border-border-custom';
    case 1.25:
      return 'bg-surface-3/60 text-text-muted border-border-custom/50';
    default:
      return 'bg-surface-2 text-text-secondary border-border-custom';
  }
};

const getPlateHeightClass = (plate: number) => {
  switch (plate) {
    case 25:
      return 'h-24 w-5';
    case 20:
      return 'h-20 w-5';
    case 15:
      return 'h-16 w-4';
    case 10:
      return 'h-14 w-4';
    case 5:
      return 'h-12 w-4';
    case 2.5:
      return 'h-10 w-3.5';
    case 1.25:
      return 'h-8 w-3';
    default:
      return 'h-12 w-4';
  }
};

function BarbellSleeveGraphic({ result }: { result: PlateCalculationResult }) {
  return (
    <div className="rounded-2xl border border-border-custom/50 bg-surface-2/60 p-4">
      <div className="mb-3 flex items-center justify-between text-xs font-semibold text-text-secondary">
        <span>Rozkład na jedną stronę gryfu</span>
        <span className="font-bold text-text-primary">{result.weightPerSide} kg na stronę</span>
      </div>

      <div className="relative flex h-32 items-center justify-start overflow-x-auto rounded-xl bg-surface-3/40 px-4 py-2">
        {/* Oś gryfu */}
        <div className="absolute inset-y-1/2 left-0 h-3 w-full -translate-y-1/2 bg-surface-raised" />

        {/* Kołnierz gryfu */}
        <div className="relative mr-2 flex h-20 w-4 items-center justify-center rounded-sm bg-surface-raised border border-border-custom">
          <div className="h-full w-1 bg-surface-2" />
        </div>

        {/* Rząd talerzy */}
        <div className="relative flex items-center gap-1.5 pl-1">
          {result.plates.length === 0 ? (
            <span className="text-xs font-medium text-text-muted">
              Sam gryf — brak dodatkowych talerzy
            </span>
          ) : (
            result.plates.flatMap((p, pIdx) =>
              Array.from({ length: p.count }).map((_, cIdx) => (
                <div
                  key={`${pIdx}-${cIdx}`}
                  className={`flex flex-col items-center justify-center rounded-md border font-extrabold shadow-sm transition-all ${getPlateHeightClass(
                    p.plate
                  )} ${getPlateColorClass(p.plate)}`}
                  title={`${p.plate} kg`}
                >
                  <span className="text-3xs leading-none">{p.plate}</span>
                </div>
              ))
            )
          )}
        </div>
      </div>

      {result.plates.length > 0 && (
        <p className="mt-3 text-center text-xs font-medium text-text-secondary">
          Załóż na każdą stronę:{' '}
          <strong className="text-text-primary">
            {result.plates.flatMap((p) => Array(p.count).fill(`${p.plate} kg`)).join(' + ')}
          </strong>
        </p>
      )}

      {result.remainder > 0 && (
        <div className="mt-3 flex items-center gap-2 rounded-xl bg-warning/10 border border-warning/25 p-2.5 text-xs text-warning">
          <Info size={14} className="shrink-0" />
          <span>Pozostało {result.remainder} kg na stronę poza standardowymi talerzami.</span>
        </div>
      )}
    </div>
  );
}

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

  const adjustWeight = (delta: number) => {
    setTotalWeight((prev) => Math.max(bar.weightKg, Math.round((prev + delta) * 10) / 10));
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Kalkulator Talerzy na Sztangę">
      <div className="space-y-5 p-1 text-text-primary">
        {/* Ciężar całkowity i kontrolki */}
        <div className="flex flex-col items-center justify-center rounded-2xl border border-border-custom/40 bg-surface-2/40 p-4">
          <span className="text-3xs font-semibold uppercase tracking-wider text-text-muted">
            Ciężar całkowity (ze sztangą)
          </span>
          <div className="my-2 flex items-center gap-3">
            <span className="text-4xl font-extrabold tracking-tight">{totalWeight}</span>
            <span className="text-base font-bold text-text-muted">kg</span>
          </div>

          {/* Szybkie przyciski korekty */}
          <div className="flex flex-wrap items-center justify-center gap-1.5 pt-1">
            <Button
              variant="outline"
              size="sm"
              onClick={() => adjustWeight(-10)}
              className="!h-8 !px-2.5 !text-xs"
              aria-label="Odejmij 10 kg"
            >
              <Minus size={12} /> 10 kg
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => adjustWeight(-2.5)}
              className="!h-8 !px-2.5 !text-xs"
              aria-label="Odejmij 2.5 kg"
            >
              <Minus size={12} /> 2.5 kg
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => adjustWeight(2.5)}
              className="!h-8 !px-2.5 !text-xs"
              aria-label="Dodaj 2.5 kg"
            >
              <Plus size={12} /> 2.5 kg
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => adjustWeight(10)}
              className="!h-8 !px-2.5 !text-xs"
              aria-label="Dodaj 10 kg"
            >
              <Plus size={12} /> 10 kg
            </Button>
          </div>
        </div>

        {/* Wybór gryfu */}
        <div className="space-y-2">
          <label className="text-3xs font-semibold uppercase tracking-wider text-text-muted">
            Wybór gryfu / maszyny
          </label>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {(['olympic', 'ez', 'smith', 'trap'] as BarType[]).map((type) => {
              const p = BAR_PRESETS[type];
              const isSelected = barType === type;
              return (
                <Button
                  key={type}
                  variant={isSelected ? 'primary' : 'outline'}
                  size="sm"
                  onClick={() => {
                    setBarType(type);
                    if (totalWeight < p.weightKg) setTotalWeight(p.weightKg);
                  }}
                  className={`!h-auto !flex-col !items-start !p-2 !text-left ${
                    isSelected ? '!border-primary' : ''
                  }`}
                >
                  <span className="text-xs font-bold leading-tight">{p.name}</span>
                  <span className="mt-0.5 text-3xs text-text-muted">{p.weightKg} kg</span>
                </Button>
              );
            })}
          </div>
        </div>

        {/* Wizualizacja tulei gryfu */}
        <BarbellSleeveGraphic result={result} />

        {/* Akcje dolne */}
        <div className="flex justify-end gap-2 pt-2">
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
              Wstaw ciężar ({totalWeight} kg)
            </Button>
          )}
        </div>
      </div>
    </Modal>
  );
}
