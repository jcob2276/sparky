import { useState } from 'react';
import { Check, ChevronDown, Plus, Minus, X } from 'lucide-react';
import { Pressable, ControlInput } from '../../ui/ControlPrimitives';
import Modal from '../../ui/Modal';
import {
  PORTION_UNIT_LABELS,
  type PortionState,
  type PortionUnit,
} from '../../../lib/health/mealPortions';

const UNIT_NAMES = { ...PORTION_UNIT_LABELS, g: 'Gramy', piece: 'Sztuka', package: 'Opakowanie' };

export default function MealDraftPortionControls({
  portion,
  rawInput,
  itemName,
  primaryUnits,
  otherUnits,
  onStep,
  onInputChange,
  onClear,
  onUnitChange,
}: {
  portion: PortionState;
  rawInput: string;
  itemName: string;
  primaryUnits: PortionUnit[];
  otherUnits: PortionUnit[];
  onStep: (direction: -1 | 1) => void;
  onInputChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onClear: () => void;
  onUnitChange: (unit: PortionUnit) => void;
}) {
  const [unitPickerOpen, setUnitPickerOpen] = useState(false);
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border-custom/30 pt-2">
      <div className="flex items-center gap-1.5">
        <Pressable
          type="button"
          onClick={() => onStep(-1)}
          className="flex h-8 w-8 items-center justify-center rounded-lg border border-border-custom bg-surface-2 text-text-secondary hover:bg-surface-3 hover:text-text-primary"
          aria-label="Zmniejsz ilość"
        >
          <Minus size={13} />
        </Pressable>
        <div className="relative flex items-center">
          <ControlInput
            type="text"
            inputMode="decimal"
            value={rawInput}
            onChange={onInputChange}
            onFocus={(e) => e.target.select()}
            placeholder="0"
            className="w-16 rounded-lg border border-border-custom bg-surface py-1 pl-2 pr-5 text-center text-xs font-bold tracking-tight text-text-primary focus:border-primary"
            aria-label={`Ilość: ${itemName}`}
          />
          {rawInput !== '' && (
            <Pressable
              type="button"
              onClick={onClear}
              className="absolute right-1 p-0.5 text-text-muted hover:text-text-primary"
              aria-label="Wyczyść ilość"
            >
              <X size={11} />
            </Pressable>
          )}
        </div>
        <Pressable
          type="button"
          onClick={() => onStep(1)}
          className="flex h-8 w-8 items-center justify-center rounded-lg border border-border-custom bg-surface-2 text-text-secondary hover:bg-surface-3 hover:text-text-primary"
          aria-label="Zwiększ ilość"
        >
          <Plus size={13} />
        </Pressable>
        <span className="ml-1 text-xs font-bold text-text-muted">
          {portion.unit === 'g' ? 'g' : PORTION_UNIT_LABELS[portion.unit]}
        </span>
      </div>

      <div className="flex min-w-0 flex-wrap items-center gap-1.5">
        {primaryUnits.map((unit) => (
          <Pressable
            key={unit}
            type="button"
            onClick={() => onUnitChange(unit)}
            className={`min-h-11 rounded-xl border px-3 py-2 text-xs font-semibold ui-interactive duration-[var(--motion-fast)] ${
              portion.unit === unit
                ? 'border-primary/30 bg-primary/10 text-primary'
                : 'border-border-custom text-text-muted hover:bg-surface-2 hover:text-text-secondary'
            }`}
          >
            {PORTION_UNIT_LABELS[unit]}
          </Pressable>
        ))}

        {otherUnits.length > 0 && (
          <Pressable
            type="button"
            onClick={() => setUnitPickerOpen(true)}
            className="flex min-h-11 items-center gap-1.5 rounded-xl border border-border-custom bg-surface px-3 text-xs font-medium text-text-secondary hover:bg-surface-2"
            aria-label="Inna jednostka"
            aria-haspopup="dialog"
            aria-expanded={unitPickerOpen}
          >
            Więcej <ChevronDown size={14} aria-hidden="true" />
          </Pressable>
        )}
      </div>

      <Modal isOpen={unitPickerOpen} onClose={() => setUnitPickerOpen(false)} title="Jednostka porcji" subtitle={itemName} size="sm" className="!bg-surface-solid">
        <div className="grid grid-cols-2 gap-2">
          {[...primaryUnits, ...otherUnits].map((unit) => (
            <Pressable
              key={unit}
              type="button"
              aria-pressed={portion.unit === unit}
              onClick={() => {
                onUnitChange(unit);
                setUnitPickerOpen(false);
              }}
              className={`flex min-h-12 items-center justify-between gap-3 rounded-xl border px-4 py-3 text-left text-sm font-medium ${
                portion.unit === unit ? 'border-primary/30 bg-primary/10 text-primary' : 'border-border-custom/60 bg-surface text-text-secondary hover:bg-surface-2'
              }`}
            >
              <span className="capitalize">{UNIT_NAMES[unit]}</span>
              {portion.unit === unit && <Check size={16} aria-hidden="true" />}
            </Pressable>
          ))}
        </div>
      </Modal>
    </div>
  );
}
