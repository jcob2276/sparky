import { useMemo, useState } from 'react';
import { Pressable, ControlInput } from '../../ui/ControlPrimitives';
import type { MealDraftItem } from '../../../lib/health/nutritionTracker';
import { draftTotals } from '../../../lib/health/mealPortions';
import MealComposerDraftRow from './MealComposerDraftRow';

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
    <div className="space-y-3 rounded-2xl border border-primary/25 bg-primary/[0.05] p-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-2xs font-black uppercase tracking-wider text-primary">Twój posiłek</p>
        <span className="text-2xs font-bold text-text-muted">{items.length} poz.</span>
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

      <div className="flex items-center justify-between gap-2 border-t border-border-custom/50 pt-2">
        <span className="text-xs text-text-muted">
          <span className="font-black text-text-primary">{totals.calories} kcal</span>
          {' · '}
          <span className="font-bold text-primary">{totals.protein}B</span>
          {' · '}
          <span className="font-bold text-warning">{totals.carbs}W</span>
          {' · '}
          <span className="font-bold text-text-secondary">{totals.fat}T</span>
        </span>
        <Pressable
          variant="primary"
          size="sm"
          onClick={() => onSave(rememberIds, memoryName.trim() || undefined)}
          loading={saving}
          disabled={!items.length}
        >
          Zapisz posiłek
        </Pressable>
      </div>
    </div>
  );
}
