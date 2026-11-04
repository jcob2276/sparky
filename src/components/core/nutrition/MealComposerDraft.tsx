import { useMemo, useState } from 'react';
import { ControlInput } from '../../ui/ControlPrimitives';
import Button from '../../ui/Button';
import { formatDecimalPl, pluralPl } from '../../../lib/formatPl';
import type { MealDraftItem } from '../../../lib/health/nutritionTracker';
import { draftTotals } from '../../../lib/health/mealPortions';
import MealComposerDraftRow from './MealComposerDraftRow';
import DraftGuidedQuestions from './DraftGuidedQuestions';
import {GlycemicEstimate} from '../../biometrics/nutrition/GlycemicEstimate';

export default function MealComposerDraft({
  items,
  saving,
  rememberedByName,
  loggedTime,
  setLoggedTime,
  memoryName,
  setMemoryName,
  onChange,
  onRemove,
  onSave,
}: {
  items: MealDraftItem[];
  saving: boolean;
  rememberedByName: Map<string, number>;
  loggedTime: string;
  setLoggedTime: (value: string) => void;
  memoryName: string;
  setMemoryName: (value: string) => void;
  onChange: (items: MealDraftItem[]) => void;
  onRemove: (id: string) => void;
  onSave: (rememberIds: Set<string>, memoryName?: string) => void;
}) {
  const [rememberIds, setRememberIds] = useState<Set<string>>(() => new Set(items.map((item) => item.id)));
  const totals = useMemo(() => draftTotals(items), [items]);

  return (
    <div className="space-y-3 rounded-xl border border-border-custom bg-surface p-3">
      <div className="ios-sheet-handle" aria-hidden="true" />
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-semibold text-text-primary">Twój posiłek</p>
        <span className="text-2xs text-text-muted">{items.length} {pluralPl(items.length, 'pozycja', 'pozycje', 'pozycji')}</span>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <label className="flex items-center gap-1.5 text-2xs font-bold text-text-muted">
          Godzina
          <ControlInput
            type="time"
            value={loggedTime}
            onChange={(event) => setLoggedTime(event.target.value)}
            className="rounded-lg border border-border-custom bg-surface px-2 py-1 text-xs font-bold"
          />
        </label>
        <ControlInput
          value={memoryName}
          onChange={(event) => setMemoryName(event.target.value)}
          placeholder="Zapisz jako szablon (opcj.)"
          className="min-w-0 flex-1 rounded-lg border border-border-custom bg-surface px-2 py-1 text-xs"
        />
      </div>

      <div className="space-y-2">
        {items.map((item) => (
          <MealComposerDraftRow
            key={item.id}
            item={item}
            rememberedGrams={rememberedByName.get(item.name.trim().toLocaleLowerCase('pl')) ?? null}
            remember={rememberIds.has(item.id)}
            onRememberChange={(value) => setRememberIds((current) => {
              const next = new Set(current);
              if (value) next.add(item.id);
              else next.delete(item.id);
              return next;
            })}
            onChange={(next) => onChange(items.map((candidate) => (candidate.id === item.id ? next : candidate)))}
            onRemove={() => onRemove(item.id)}
          />
        ))}
      </div>

      <DraftGuidedQuestions items={items} onChange={onChange} />
      <GlycemicEstimate items={items.map(item=>({id:item.id,name:item.name,grams:item.grams,carbs:item.carbs,fiber:item.fiber}))}/>
      <div className="space-y-3 border-t border-border-custom/50 pt-3">
        <span className="text-xs text-text-muted">
          <span className="font-semibold tabular-nums text-text-primary">{formatDecimalPl(totals.calories)} kcal</span>
          {' · '}
          <span className="meal-macro meal-macro-label tabular-nums" data-macro="protein">{formatDecimalPl(totals.protein)} B</span>
          {' · '}
          <span className="meal-macro meal-macro-label tabular-nums" data-macro="carbs">{items.some((item) => item.carbs != null) ? formatDecimalPl(totals.carbs) : '—'} W</span>
          {' · '}
          <span className="meal-macro meal-macro-label tabular-nums" data-macro="fat">{items.some((item) => item.fat != null) ? formatDecimalPl(totals.fat) : '—'} T</span>
        </span>
        <Button
          variant="neutral"
          size="lg"
          onClick={() => onSave(rememberIds, memoryName.trim() || undefined)}
          loading={saving}
          disabled={!items.length}
          className="min-h-14 w-full"
        >
          Zapisz posiłek
        </Button>
      </div>
    </div>
  );
}
