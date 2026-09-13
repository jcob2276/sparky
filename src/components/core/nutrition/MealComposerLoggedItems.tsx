import { ChevronRight, Copy } from 'lucide-react';
import { Pressable } from '../../ui/ControlPrimitives';
import type { TodayFoodEntry } from '../../../lib/health/composerTodayMealsApi';
import type { RecentEntry } from './hooks/foodEntryUtils';
import SwipeableFoodEntry from './SwipeableFoodEntry';

const MEAL_LABEL: Record<string, string> = {
  breakfast: 'Śniadanie',
  lunch: 'Obiad',
  dinner: 'Kolacja',
  snack: 'Przekąska',
};

interface MealComposerLoggedItemsProps {
  entries: TodayFoodEntry[];
  onEditEntry: (entry: RecentEntry) => void;
  onDeleteEntry?: (id: string) => void;
  dateLabel?: string;
  isPastDay?: boolean;
  onCopyEntireDay?: () => void;
  onCopyMeal?: (mealType: string) => void;
  copying?: boolean;
}

export default function MealComposerLoggedItems({
  entries,
  onEditEntry,
  onDeleteEntry,
  dateLabel = 'Zjedzone dziś',
  isPastDay,
  onCopyEntireDay,
  onCopyMeal,
  copying,
}: MealComposerLoggedItemsProps) {
  if (!entries.length) return null;

  const totalKcal = Math.round(entries.reduce((s, e) => s + (e.calories ?? 0), 0));
  const totalProtein = Math.round(entries.reduce((s, e) => s + (e.protein ?? 0), 0) * 10) / 10;

  // Group by meal_type preserving order of first appearance
  const order: string[] = [];
  const groups = new Map<string, TodayFoodEntry[]>();
  for (const entry of entries) {
    const key = entry.meal_type;
    if (!groups.has(key)) {
      order.push(key);
      groups.set(key, []);
    }
    groups.get(key)!.push(entry);
  }

  return (
    <div className="space-y-3">
      {isPastDay && onCopyEntireDay && (
        <div className="flex items-center justify-between gap-3 p-3 rounded-2xl border border-primary/25 bg-primary/[0.05] shadow-2xs">
          <div className="min-w-0 flex-1">
            <p className="text-xs font-black text-text-primary leading-tight">Dzień z przeszłości</p>
            <p className="text-2xs font-medium text-text-muted">Możesz skopiować te posiłki do dzisiaj</p>
          </div>
          <Pressable
            type="button"
            variant="primary"
            onClick={onCopyEntireDay}
            disabled={copying}
            className="shrink-0 flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-black shadow-xs active:scale-95 disabled:opacity-50"
          >
            <Copy size={12} />
            <span>Skopiuj dzień</span>
          </Pressable>
        </div>
      )}

      <div className="flex items-center justify-between px-1">
        <p className="text-2xs font-black uppercase tracking-widest text-text-muted">
          {dateLabel}
        </p>
        <span className="text-2xs font-bold text-text-muted">
          {totalKcal} kcal&nbsp;&middot;&nbsp;<span className="text-primary font-black">{totalProtein} g B</span>
        </span>
      </div>

      <div className="space-y-3">
        {order.map((mealType) => {
          const group = groups.get(mealType)!;
          const groupKcal = Math.round(group.reduce((s, e) => s + (e.calories ?? 0), 0));
          return (
            <div key={mealType} className="space-y-1.5">
              <div className="flex items-center justify-between px-1">
                <span className="text-2xs font-black uppercase tracking-wider text-text-muted">
                  {MEAL_LABEL[mealType] ?? mealType}
                </span>
                <div className="flex items-center gap-2">
                  <span className="text-2xs font-semibold text-text-muted">{groupKcal} kcal</span>
                  {isPastDay && onCopyMeal && (
                    <Pressable
                      type="button"
                      onClick={() => onCopyMeal(mealType)}
                      disabled={copying}
                      className="flex items-center gap-1 rounded-lg border border-primary/30 bg-primary/10 px-2 py-0.5 text-2xs font-bold text-primary hover:bg-primary/20 active:scale-95 disabled:opacity-50"
                    >
                      <Copy size={10} />
                      <span>Kopiuj</span>
                    </Pressable>
                  )}
                </div>
              </div>
              <div className="overflow-hidden rounded-2xl border border-border-custom/60 bg-surface-solid/30 divide-y divide-border-custom/25 shadow-2xs">
                {group.map((entry) => (
                  <SwipeableFoodEntry
                    key={entry.id}
                    onDelete={onDeleteEntry ? () => onDeleteEntry(entry.id) : () => undefined}
                  >
                    <Pressable
                      onClick={() =>
                        onEditEntry({
                          id: entry.id,
                          name: entry.name,
                          brand: entry.brand,
                          calories: entry.calories,
                          protein: entry.protein,
                          carbs: entry.carbs,
                          fat: entry.fat,
                          amount: entry.amount,
                          date: entry.date,
                          meal_type: entry.meal_type,
                        })
                      }
                      className="flex w-full items-center justify-between gap-3 px-3.5 py-2.5 text-left transition-colors duration-150 hover:bg-surface-solid/50 active:bg-surface-solid/80"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-xs font-bold text-text-primary leading-tight">{entry.name}</p>
                        <div className="mt-0.5 flex items-center gap-1.5 text-2xs text-text-muted">
                          {entry.brand && <span className="truncate">{entry.brand}</span>}
                          {entry.brand && entry.amount && <span>&middot;</span>}
                          {entry.amount && <span>{entry.amount}</span>}
                          {entry.protein != null && (
                            <>
                              <span>&middot;</span>
                              <span className="text-primary font-semibold">{Math.round(entry.protein * 10) / 10}g B</span>
                            </>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <span className="text-xs font-black text-text-primary">
                          {entry.calories ?? '?'}
                          <span className="ml-0.5 text-2xs font-normal text-text-muted">kcal</span>
                        </span>
                        <ChevronRight size={13} className="text-text-muted/40 transition-transform duration-150 group-active:translate-x-0.5" />
                      </div>
                    </Pressable>
                  </SwipeableFoodEntry>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
