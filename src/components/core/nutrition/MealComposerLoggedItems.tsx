import { Pencil } from 'lucide-react';
import { Pressable } from '../../ui/ControlPrimitives';
import type { TodayFoodEntry } from '../../../lib/health/composerTodayMealsApi';
import type { RecentEntry } from './hooks/foodEntryUtils';

const MEAL_LABEL: Record<string, string> = {
  breakfast: 'Śniadanie',
  lunch: 'Obiad',
  dinner: 'Kolacja',
  snack: 'Przekąska',
};

interface MealComposerLoggedItemsProps {
  entries: TodayFoodEntry[];
  onEditEntry: (entry: RecentEntry) => void;
}

export default function MealComposerLoggedItems({
  entries,
  onEditEntry,
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
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-2xs font-black uppercase tracking-widest text-text-muted">
          Dziś zjadłem
        </p>
        <span className="text-2xs font-bold text-text-muted">
          {totalKcal} kcal&nbsp;&middot;&nbsp;<span className="text-primary">{totalProtein}B</span>
        </span>
      </div>

      <div className="space-y-2">
        {order.map((mealType) => {
          const group = groups.get(mealType)!;
          const groupKcal = Math.round(group.reduce((s, e) => s + (e.calories ?? 0), 0));
          return (
            <div key={mealType} className="space-y-0.5">
              <div className="flex items-center gap-1.5 px-0.5">
                <span className="text-2xs font-black uppercase tracking-wider text-text-muted">
                  {MEAL_LABEL[mealType] ?? mealType}
                </span>
                <span className="text-2xs text-text-muted/60">{groupKcal} kcal</span>
              </div>
              {group.map((entry, index) => (
                <div
                  key={entry.id}
                  className="group flex items-center gap-2 rounded-xl border border-border-custom/40 bg-surface-solid/40 px-3 py-2 transition-all hover:bg-surface-solid/70"
                  style={{ animation: `fadeIn 300ms ease-out forwards`, animationDelay: `${index * 40}ms`, opacity: 0, transform: 'translateY(8px)' }}
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
                    className="flex min-w-0 flex-1 items-center gap-2 text-left transition-transform duration-150 ease-[var(--ease-out,ease-out)] active:scale-[0.97]"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-bold text-text-primary transition-colors duration-200">{entry.name}</p>
                      {entry.amount && (
                        <p className="text-2xs text-text-muted transition-colors duration-200">{entry.amount}</p>
                      )}
                    </div>
                    <span className="shrink-0 text-2xs font-black text-text-secondary">
                      {entry.calories ?? '?'} kcal
                    </span>
                    <Pencil
                      size={11}
                      className="shrink-0 text-text-muted/40 opacity-0 transition-opacity duration-200 ease-out group-hover:opacity-100"
                    />
                  </Pressable>
                </div>
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
}
