import { memo } from 'react';
import { Check, Copy } from 'lucide-react';
import { Pressable } from '../../../ui/ControlPrimitives';
import { useHaptics } from '../../../../hooks/useHaptics';
import { MEAL_TYPES, type MealTypeId } from '../../../../lib/health/foodLogging';
import type { TodayFoodEntry } from '../../../../lib/health/composerTodayMealsApi';

interface MealGroupCardProps {
  mealType: MealTypeId;
  entries: TodayFoodEntry[];
  selectedIds: Set<string>;
  onToggleItem: (id: string) => void;
  onToggleMeal: (mealType: MealTypeId) => void;
  copying: boolean;
  onCopyMeal: (mealType: MealTypeId) => void;
}

export default memo(function MealGroupCard({
  mealType,
  entries,
  selectedIds,
  onToggleItem,
  onToggleMeal,
  copying,
  onCopyMeal,
}: MealGroupCardProps) {
  const haptics = useHaptics();
  const meta = MEAL_TYPES.find((m) => m.id === mealType);
  const mealTitle = meta?.label ?? mealType;

  const mealSelectedEntries = entries.filter((e) => selectedIds.has(e.id));
  const allSelected = entries.length > 0 && mealSelectedEntries.length === entries.length;
  const someSelected = mealSelectedEntries.length > 0;

  const displayCalories = Math.round(
    (someSelected ? mealSelectedEntries : entries).reduce((sum, e) => sum + (e.calories ?? 0), 0)
  );
  const displayProtein = Math.round(
    (someSelected ? mealSelectedEntries : entries).reduce((sum, e) => sum + (e.protein ?? 0), 0) * 10
  ) / 10;

  return (
    <div className="overflow-hidden rounded-2xl border border-border-custom/80 bg-surface-solid/35 shadow-2xs transition-all hover:border-primary/30">
      {/* Header with Master Meal Toggle & Copy Action */}
      <div className="flex items-center justify-between border-b border-border-custom/40 bg-surface-solid/60 px-3.5 py-2.5">
        <Pressable
          type="button"
          onClick={() => {
            haptics.selection();
            onToggleMeal(mealType);
          }}
          className="touch-manipulation flex items-center gap-2.5 text-left group"
        >
          <div
            className={`flex h-4 w-4 items-center justify-center rounded-md border transition-all ${
              allSelected
                ? 'border-primary bg-primary text-on-accent shadow-xs'
                : someSelected
                ? 'border-primary/60 bg-primary/20 text-primary'
                : 'border-border-custom bg-surface-solid/50'
            }`}
          >
            {(allSelected || someSelected) && <Check size={11} strokeWidth={3} />}
          </div>
          <div>
            <span className="text-xs font-black uppercase tracking-wider text-text-primary group-hover:text-primary transition-colors">
              {mealTitle}
            </span>
            <span className="ml-2 text-2xs font-bold text-text-muted">
              {displayCalories} kcal · <span className="text-primary font-black">{displayProtein} g B</span>
              {entries.length > 1 && (
                <span className="ml-1 text-text-muted/70 font-normal">
                  ({mealSelectedEntries.length}/{entries.length})
                </span>
              )}
            </span>
          </div>
        </Pressable>

        <Pressable
          type="button"
          onClick={() => onCopyMeal(mealType)}
          disabled={copying || mealSelectedEntries.length === 0}
          className="touch-manipulation flex items-center gap-1.5 rounded-xl border border-primary/30 bg-primary/10 px-2.5 py-1 text-xs font-bold text-primary transition-all hover:bg-primary/20 active:scale-95 disabled:opacity-40"
          title={`Kopiuj ${mealSelectedEntries.length} poz.`}
        >
          <Copy size={12} />
          <span>Kopiuj</span>
        </Pressable>
      </div>

      {/* Food Items with Interactive Row Checkboxes */}
      <div className="divide-y divide-border-custom/30 px-3 py-1">
        {entries.map((item) => {
          const isChecked = selectedIds.has(item.id);

          return (
            <Pressable
              key={item.id}
              type="button"
              onClick={() => {
                haptics.selection();
                onToggleItem(item.id);
              }}
              className={`touch-manipulation flex w-full items-center justify-between py-2 text-xs text-left transition-all rounded-lg px-1.5 ${
                isChecked
                  ? 'text-text-primary hover:bg-surface-solid/40'
                  : 'text-text-muted/60 opacity-60 hover:opacity-90 hover:bg-surface-solid/20'
              }`}
            >
              <div className="flex items-center gap-2.5 min-w-0 flex-1 pr-3">
                <div
                  className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-md border transition-all ${
                    isChecked
                      ? 'border-primary bg-primary text-on-accent shadow-xs'
                      : 'border-border-custom bg-surface-solid/50'
                  }`}
                >
                  {isChecked && <Check size={11} strokeWidth={3} />}
                </div>
                <div className="min-w-0 flex-1">
                  <span className={`block truncate font-bold leading-tight ${isChecked ? 'text-text-primary' : 'text-text-muted line-through'}`}>
                    {item.name}
                  </span>
                  <div className="mt-0.5 flex items-center gap-1.5 text-2xs text-text-muted">
                    {item.amount && <span>{item.amount}</span>}
                    {item.protein != null && (
                      <>
                        <span>·</span>
                        <span className="text-primary font-semibold">{Math.round(item.protein * 10) / 10}g B</span>
                      </>
                    )}
                  </div>
                </div>
              </div>

              <span className="shrink-0 font-display text-xs font-black text-text-primary">
                {Math.round(item.calories ?? 0)} <span className="text-2xs font-normal text-text-muted">kcal</span>
              </span>
            </Pressable>
          );
        })}
      </div>
    </div>
  );
});

