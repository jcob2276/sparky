import { Bookmark, Trash2, Plus, Minus, X } from 'lucide-react';
import { useMemo, useState, useEffect } from 'react';
import { Pressable, ControlInput, ControlSelect } from '../../ui/ControlPrimitives';
import type { MealDraftItem } from '../../../lib/health/nutritionTracker';
import {
  PORTION_UNIT_LABELS,
  DRAFT_UNIT_OPTIONS,
  applyPortionState,
  buildPortionChips,
  inferPortionState,
  scaleDraftItem,
  switchPortionUnit,
  type PortionState,
  type PortionUnit,
} from '../../../lib/health/mealPortions';
import { confidenceLabel } from '../../../lib/health/foodLogging';

export default function MealComposerDraftRow({
  item,
  rememberedGrams,
  remember,
  onRememberChange,
  onChange,
  onRemove,
}: {
  item: MealDraftItem;
  rememberedGrams?: number | null;
  remember: boolean;
  onRememberChange: (value: boolean) => void;
  onChange: (item: MealDraftItem) => void;
  onRemove: () => void;
}) {
  const [portion, setPortion] = useState(() => inferPortionState(item));
  const [rawInput, setRawInput] = useState<string>(() =>
    portion.unit === 'g' ? String(Math.round(portion.quantity)) : String(portion.quantity)
  );
  const badge = confidenceLabel(item);
  const chips = useMemo(() => buildPortionChips(item, rememberedGrams, portion), [item, rememberedGrams, portion]);

  useEffect(() => {
    const formatted = portion.unit === 'g' ? String(Math.round(portion.quantity)) : String(portion.quantity);
    const trimmed = rawInput.trim();
    if (trimmed === '' && portion.quantity === 0) {
      return;
    }
    const parsed = parseFloat(rawInput.replace(',', '.'));
    if (isNaN(parsed) || parsed !== portion.quantity) {
      setRawInput(formatted);
    }
  }, [portion.quantity, portion.unit]);

  const applyPortion = (next: PortionState) => {
    setPortion(next);
    setRawInput(next.unit === 'g' ? String(Math.round(next.quantity)) : String(next.quantity));
    onChange(applyPortionState(item, next));
  };

  const onQuantityChange = (quantity: number) => {
    const next = { ...portion, quantity };
    setPortion(next);
    onChange(applyPortionState(item, next));
  };

  const onUnitChange = (unit: PortionUnit) => {
    const next = switchPortionUnit(item, unit);
    applyPortion(next);
  };

  const onGramsDirect = (grams: number) => {
    const next = scaleDraftItem(item, grams);
    const nextPortion = { unit: 'g' as const, quantity: grams, gramsPerUnit: 1 };
    setPortion(nextPortion);
    onChange(applyPortionState(next, nextPortion));
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setRawInput(val);

    const normalized = val.replace(',', '.').trim();
    if (normalized === '') {
      if (portion.unit === 'g') onGramsDirect(0);
      else onQuantityChange(0);
      return;
    }

    const num = parseFloat(normalized);
    if (!isNaN(num) && num >= 0) {
      if (portion.unit === 'g') onGramsDirect(Math.round(num));
      else onQuantityChange(num);
    }
  };

  const handleStep = (direction: -1 | 1) => {
    const current = parseFloat(rawInput.replace(',', '.')) || 0;
    const step = portion.unit === 'g' ? (current >= 100 ? 50 : 25) : 1;
    const next = Math.max(0, portion.unit === 'g' ? Math.round(current + direction * step) : Math.round((current + direction * step) * 10) / 10);
    setRawInput(String(next));
    if (portion.unit === 'g') onGramsDirect(next);
    else onQuantityChange(next);
  };

  const handleClear = () => {
    setRawInput('');
    if (portion.unit === 'g') onGramsDirect(0);
    else onQuantityChange(0);
  };

  const primaryUnits = useMemo(() => {
    const list: PortionUnit[] = ['g'];
    if (portion.unit !== 'g') {
      list.push(portion.unit);
    } else {
      const inferred = inferPortionState(item).unit;
      if (inferred !== 'g') list.push(inferred);
    }
    if (!list.includes('package') && list.length < 3) list.push('package');
    return list;
  }, [portion.unit, item]);

  const otherUnits = useMemo(() => {
    return DRAFT_UNIT_OPTIONS.filter((u) => !primaryUnits.includes(u));
  }, [primaryUnits]);

  return (
    <div className="rounded-xl border border-border-custom/70 bg-surface/80 p-3 space-y-2.5 animate-fade-in">
      <div className="flex items-start gap-2">
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-bold text-text-primary">{item.name}</p>
          <p className="mt-0.5 text-2xs text-text-muted">
            {item.calories} kcal · {item.protein}B · {item.carbs}W · {item.fat}T
          </p>
          {item.assumptions?.length ? (
            <p className="mt-0.5 text-2xs leading-snug text-warning/90">{item.assumptions.join(' · ')}</p>
          ) : null}
        </div>
        {badge ? (
          <span
            className={`shrink-0 rounded px-1.5 py-0.5 text-2xs font-bold uppercase ${
              badge === 'sprawdź' ? 'bg-warning/15 text-warning' : 'bg-success/15 text-success'
            }`}
          >
            {badge}
          </span>
        ) : null}
        <Pressable
          variant="ghost"
          onClick={() => onRememberChange(!remember)}
          className={`shrink-0 p-1 ${remember ? 'text-primary' : 'text-text-muted hover:text-primary'}`}
          title={remember ? 'Zapamiętam tę porcję' : 'Nie zapamiętuj porcji'}
        >
          <Bookmark size={14} className={remember ? 'fill-current' : ''} />
        </Pressable>
        <Pressable variant="ghost" onClick={onRemove} className="shrink-0 p-1 text-text-muted hover:text-danger">
          <Trash2 size={14} />
        </Pressable>
      </div>

      {chips.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {chips.map((chip) => {
            const isSelected =
              portion.unit === chip.state.unit &&
              Math.abs(portion.quantity - chip.state.quantity) < 0.01;
            return (
              <Pressable
                key={chip.label}
                type="button"
                onClick={() => applyPortion(chip.state)}
                className={`rounded-full border px-2 py-0.5 text-2xs font-bold ui-interactive duration-[var(--motion-fast)] ease-[var(--ease-out,ease-out)] active:scale-[0.95] ${
                  isSelected
                    ? 'border-primary/50 bg-primary/10 text-primary'
                    : 'border-border-custom text-text-secondary hover:border-primary/40 hover:text-primary'
                }`}
              >
                {chip.label}
              </Pressable>
            );
          })}
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border-custom/30 pt-2">
        <div className="flex items-center gap-1.5">
          <Pressable
            type="button"
            onClick={() => handleStep(-1)}
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
              onChange={handleInputChange}
              onFocus={(e) => e.target.select()}
              placeholder="0"
              className="w-16 rounded-lg border border-border-custom bg-surface py-1 pl-2 pr-5 text-center text-xs font-bold tracking-tight text-text-primary focus:border-primary"
              aria-label={`Ilość: ${item.name}`}
            />
            {rawInput !== '' && (
              <Pressable
                type="button"
                onClick={handleClear}
                className="absolute right-1 p-0.5 text-text-muted hover:text-text-primary"
                aria-label="Wyczyść ilość"
              >
                <X size={11} />
              </Pressable>
            )}
          </div>
          <Pressable
            type="button"
            onClick={() => handleStep(1)}
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
    </div>
  );
}
