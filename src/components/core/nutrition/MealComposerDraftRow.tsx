import { Bookmark, Trash2 } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Pressable, ControlInput } from '../../ui/ControlPrimitives';
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
  const badge = confidenceLabel(item);
  const chips = useMemo(() => buildPortionChips(item, rememberedGrams), [item, rememberedGrams]);

  const applyPortion = (next: PortionState) => {
    setPortion(next);
    onChange(applyPortionState(item, next));
  };

  const onQuantityChange = (raw: string) => {
    const quantity = Math.max(0.25, Number(raw.replace(',', '.')) || 0);
    applyPortion({ ...portion, quantity });
  };

  const onUnitChange = (unit: PortionUnit) => {
    const next = switchPortionUnit(item, unit);
    setPortion(next);
    onChange(applyPortionState(item, next));
  };

  const onGramsDirect = (grams: number) => {
    const next = scaleDraftItem(item, grams);
    const nextPortion = { unit: 'g' as const, quantity: grams, gramsPerUnit: 1 };
    setPortion(nextPortion);
    onChange(applyPortionState(next, nextPortion));
  };

  return (
    <div className="rounded-xl border border-border-custom/70 bg-surface/80 px-3 py-2.5">
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
          <span className={`shrink-0 rounded px-1.5 py-0.5 text-2xs font-bold uppercase ${badge === 'sprawdź' ? 'bg-warning/15 text-warning' : 'bg-success/15 text-success'}`}>
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

      <div className="mt-2 flex flex-wrap gap-1">
        {chips.map((chip) => (
          <Pressable
            key={chip.label}
            type="button"
            onClick={() => applyPortion(chip.state)}
            className="rounded-full border border-border-custom px-2 py-0.5 text-2xs font-bold text-text-secondary hover:border-primary/40 hover:text-primary"
          >
            {chip.label}
          </Pressable>
        ))}
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-1.5">
        {DRAFT_UNIT_OPTIONS.map((unit) => (
          <Pressable
            key={unit}
            type="button"
            onClick={() => onUnitChange(unit)}
            className={`rounded-full px-2 py-1 text-2xs font-black uppercase tracking-wide ${
              portion.unit === unit ? 'bg-primary text-on-accent' : 'border border-border-custom text-text-muted'
            }`}
          >
            {PORTION_UNIT_LABELS[unit]}
          </Pressable>
        ))}
        <ControlInput
          type="number"
          inputMode="decimal"
          value={portion.unit === 'g' ? String(Math.round(portion.quantity)) : String(portion.quantity)}
          onChange={(event: React.ChangeEvent<HTMLInputElement>) => {
            const value = Number(event.target.value.replace(',', '.'));
            if (portion.unit === 'g') onGramsDirect(Math.max(1, Math.round(value || 0)));
            else onQuantityChange(event.target.value);
          }}
          className="ml-auto w-16 rounded-lg border border-border-custom bg-surface px-2 py-1 text-right text-xs font-bold"
          aria-label={`Ilość: ${item.name}`}
        />
        <span className="text-2xs font-bold text-text-muted">
          {portion.unit === 'g' ? 'g' : PORTION_UNIT_LABELS[portion.unit]}
        </span>
      </div>
    </div>
  );
}
