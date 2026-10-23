import { Bookmark, Trash2 } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Pressable } from '../../ui/ControlPrimitives';
import type { MealDraftItem } from '../../../lib/health/nutritionTracker';
import {
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
import MealDraftPortionControls from './MealDraftPortionControls';
import MealDraftChips from './MealDraftChips';

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
            className={`shrink-0 rounded px-1.5 py-0.5 text-2xs font-bold ${
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
        <Pressable variant="ghost" onClick={onRemove} className="shrink-0 min-h-11 min-w-11 p-1 flex items-center justify-center text-text-muted hover:text-danger">
          <Trash2 size={14} />
        </Pressable>
      </div>

      <MealDraftChips chips={chips} portion={portion} onSelectChip={applyPortion} />

      <MealDraftPortionControls
        portion={portion}
        rawInput={rawInput}
        itemName={item.name}
        primaryUnits={primaryUnits}
        otherUnits={otherUnits}
        onStep={handleStep}
        onInputChange={handleInputChange}
        onClear={handleClear}
        onUnitChange={onUnitChange}
      />
    </div>
  );
}
