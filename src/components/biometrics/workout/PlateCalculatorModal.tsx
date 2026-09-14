import { useState, useId } from 'react';
import Modal from '../../ui/Modal';
import { Pressable, ControlInput } from '../../ui/ControlPrimitives';
import { calculatePlates } from '../../../lib/health/workoutPlateCalculator';
import { useHaptics } from '../../../hooks/useHaptics';

interface PlateCalculatorModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialWeight?: number;
  onApplyWeight?: (weight: number) => void;
}

const PLATE_COLORS: Record<number, string> = {
  25: 'bg-rose-500/20 text-rose-300 border-rose-500/40',
  20: 'bg-blue-500/20 text-blue-300 border-blue-500/40',
  15: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
  10: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
  5: 'bg-slate-500/20 text-slate-300 border-slate-500/40',
  2.5: 'bg-purple-500/20 text-purple-300 border-purple-500/40',
  1.25: 'bg-zinc-500/20 text-zinc-300 border-zinc-500/40',
};

export default function PlateCalculatorModal({
  isOpen,
  onClose,
  initialWeight = 60,
  onApplyWeight,
}: PlateCalculatorModalProps) {
  const [totalWeight, setTotalWeight] = useState<number>(initialWeight > 0 ? initialWeight : 60);
  const [barWeight, setBarWeight] = useState<number>(20);
  const haptics = useHaptics();
  const weightInputId = useId();

  const calc = calculatePlates(totalWeight, barWeight);

  const handleAdjust = (delta: number) => {
    haptics.light();
    setTotalWeight((w) => Math.max(barWeight, Math.round((w + delta) * 100) / 100));
  };

  const handleApply = () => {
    haptics.success();
    onApplyWeight?.(totalWeight);
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Kalkulator Talerzy" size="sm">
      <div className="space-y-4">
        {/* Weight & Bar Selection */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex-1 space-y-1">
            <label htmlFor={weightInputId} className="text-3xs font-black uppercase tracking-wider text-text-muted">
              Ciężar całkowity (kg)
            </label>
            <ControlInput
              id={weightInputId}
              type="number"
              min={barWeight}
              step={1.25}
              value={totalWeight}
              onChange={(e) => setTotalWeight(parseFloat(e.target.value) || barWeight)}
              className="w-full bg-surface-solid border border-border-custom rounded-xl px-3 py-2 text-lg font-black text-text-primary text-center outline-none focus:border-primary/50"
            />
          </div>

          <div className="space-y-1 shrink-0">
            <label className="text-3xs font-black uppercase tracking-wider text-text-muted">Gryf</label>
            <div className="flex gap-1">
              {[20, 15, 10].map((b) => (
                <Pressable
                  key={b}
                  onClick={() => {
                    haptics.light();
                    setBarWeight(b);
                  }}
                  className={`px-2.5 py-2 text-xs font-black rounded-xl border transition-all cursor-pointer ${
                    barWeight === b
                      ? 'border-primary bg-primary/15 text-primary'
                      : 'border-border-custom bg-surface text-text-secondary hover:text-text-primary'
                  }`}
                >
                  {b}k
                </Pressable>
              ))}
            </div>
          </div>
        </div>

        {/* Quick adjustments */}
        <div className="flex gap-1.5 justify-center">
          {[-10, -2.5, -1.25, 1.25, 2.5, 10].map((step) => (
            <Pressable
              key={step}
              onClick={() => handleAdjust(step)}
              className="px-2 py-1 text-2xs font-bold rounded-lg border border-border-custom bg-surface text-text-secondary hover:text-text-primary active:scale-95 transition-all cursor-pointer"
            >
              {step > 0 ? `+${step}` : step}
            </Pressable>
          ))}
        </div>

        {/* Per side summary */}
        <div className="rounded-2xl border border-border-custom bg-surface/50 p-4 space-y-3">
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold text-text-muted uppercase tracking-wider">Na jedną stronę:</span>
            <span className="font-black text-base text-primary font-mono">{calc.weightPerSide} kg</span>
          </div>

          {/* Plates visual breakdown */}
          {calc.plates.length === 0 ? (
            <div className="py-2 text-center text-xs font-bold text-text-muted">Sam gryf ({barWeight} kg)</div>
          ) : (
            <div className="flex flex-wrap items-center gap-1.5 justify-center pt-1">
              {calc.plates.map((p) => {
                const colorClass = PLATE_COLORS[p.plate] || 'bg-surface border-border-custom text-text-primary';
                return Array.from({ length: p.count }).map((_, i) => (
                  <div
                    key={`${p.plate}-${i}`}
                    className={`flex flex-col items-center justify-center rounded-lg border px-2.5 py-1.5 font-mono font-black text-xs shadow-sm ${colorClass}`}
                  >
                    <span>{p.plate}</span>
                    <span className="text-3xs uppercase tracking-tight opacity-75">kg</span>
                  </div>
                ));
              })}
            </div>
          )}

          {calc.remainder > 0 && (
            <p className="text-3xs font-bold text-warning text-center">
              Pozostałość niemożliwa do ułożenia: {calc.remainder} kg
            </p>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-2 pt-1">
          <Pressable
            onClick={onClose}
            className="flex-1 py-2.5 rounded-xl border border-border-custom bg-surface text-text-secondary text-xs font-bold hover:text-text-primary transition-all text-center cursor-pointer"
          >
            Anuluj
          </Pressable>
          {onApplyWeight && (
            <Pressable
              onClick={handleApply}
              className="flex-1 py-2.5 rounded-xl bg-primary text-on-accent text-xs font-black uppercase tracking-wider shadow-md hover:bg-primary-hover transition-all text-center cursor-pointer"
            >
              Zastosuj {totalWeight} kg
            </Pressable>
          )}
        </div>
      </div>
    </Modal>
  );
}
