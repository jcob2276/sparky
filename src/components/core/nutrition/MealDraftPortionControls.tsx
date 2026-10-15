import { Plus, Minus, X } from 'lucide-react';
import { Pressable, ControlInput, ControlSelect } from '../../ui/ControlPrimitives';
import {
  PORTION_UNIT_LABELS,
  type PortionState,
  type PortionUnit,
} from '../../../lib/health/mealPortions';

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

      <div className="flex items-center gap-1">
        {primaryUnits.map((unit) => (
          <Pressable
            key={unit}
            type="button"
            onClick={() => onUnitChange(unit)}
            className={`rounded-lg px-2 py-1 text-2xs font-extrabold uppercase tracking-wide ui-interactive duration-[var(--motion-fast)] ${
              portion.unit === unit
                ? 'bg-primary text-on-accent shadow-sm'
                : 'border border-border-custom text-text-muted hover:bg-surface-2 hover:text-text-secondary'
            }`}
          >
            {PORTION_UNIT_LABELS[unit]}
          </Pressable>
        ))}

        {otherUnits.length > 0 && (
          <ControlSelect
            value={otherUnits.includes(portion.unit) ? portion.unit : ''}
            onChange={(e) => {
              if (e.target.value) onUnitChange(e.target.value as PortionUnit);
            }}
            className={`h-7 rounded-lg border border-border-custom bg-surface px-1.5 text-2xs font-bold uppercase text-text-secondary ${
              otherUnits.includes(portion.unit) ? 'border-primary text-primary' : ''
            }`}
            aria-label="Inna jednostka"
          >
            <option value="" disabled>
              Inna...
            </option>
            {otherUnits.map((unit) => (
              <option key={unit} value={unit}>
                {PORTION_UNIT_LABELS[unit]}
              </option>
            ))}
          </ControlSelect>
        )}
      </div>
    </div>
  );
}
