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

/** Ids of the first entry of each meal that has a photo, so the thumbnail shows once per meal. */
function firstRowIdPerPhoto(entries: TodayFoodEntry[], photoUrls: Record<string, string>): Set<string> {
  const rowIds = new Set<string>();
  const seenGroups = new Set<string>();
  for (const entry of entries) {
    const groupId = entry.meal_group_id;
    if (groupId && photoUrls[groupId] && !seenGroups.has(groupId)) {
      seenGroups.add(groupId);
      rowIds.add(entry.id);
    }
  }
  return rowIds;
}

function PastDayBanner({ onCopy, copying }: { onCopy: () => void; copying?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-3 p-3 rounded-2xl border border-primary/25 bg-primary/[0.05] shadow-2xs">
      <div className="min-w-0 flex-1">
        <p className="text-xs font-semibold text-text-primary leading-tight">Dzień z przeszłości</p>
        <p className="text-2xs font-medium text-text-muted">Możesz skopiować te posiłki do dzisiaj</p>
      </div>
      <Pressable
        type="button"
        variant="primary"
        onClick={onCopy}
        disabled={copying}
        className="shrink-0 flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold shadow-xs active:scale-95 disabled:opacity-50"
      >
        <Copy size={12} />
        <span>Skopiuj dzień</span>
      </Pressable>
    </div>
  );
}

interface MealComposerLoggedItemsProps {
  entries: TodayFoodEntry[];
  /** Signed photo URLs keyed by meal_group_id; the photo is shown on the first row of its meal. */
  photoUrls?: Record<string, string>;
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
  photoUrls = {},
  onEditEntry,
  onDeleteEntry,
  dateLabel = 'Zjedzone',
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

  const photoRowIds = firstRowIdPerPhoto(entries, photoUrls);

  return (
    <section aria-label={dateLabel} className="space-y-2 border-t border-border-custom/40 pt-3">
      {isPastDay && onCopyEntireDay && <PastDayBanner onCopy={onCopyEntireDay} copying={copying} />}

      <div className="flex items-center justify-between px-1">
        <h3 className="text-xs font-semibold tracking-wide text-text-muted">{dateLabel}</h3>
        <span className="text-2xs font-bold tabular-nums text-text-muted">
          {totalKcal} kcal&nbsp;&middot;&nbsp;<span className="text-primary">{totalProtein} g B</span>
        </span>
      </div>

      <div className="space-y-2">
        {order.map((mealType) => {
          const group = groups.get(mealType)!;
          const groupKcal = Math.round(group.reduce((s, e) => s + (e.calories ?? 0), 0));
          return (
            <div key={mealType} className="space-y-1">
              <div className="flex items-center justify-between px-1">
                <span className="text-2xs font-semibold tracking-wide text-text-muted">
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
              <div className="overflow-hidden rounded-xl border border-border-custom/60 bg-surface-solid/30 divide-y divide-border-custom/25">
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
                          meal_group_id: entry.meal_group_id,
                          photoUrl: entry.meal_group_id ? photoUrls[entry.meal_group_id] : null,
                        })
                      }
                      className="flex w-full items-center justify-between gap-3 px-3 py-1 text-left transition-colors duration-150 hover:bg-surface-solid/50 active:bg-surface-solid/80"
                    >
                      {photoRowIds.has(entry.id) && entry.meal_group_id && (
                        <img
                          src={photoUrls[entry.meal_group_id]}
                          alt={`Zdjęcie posiłku: ${entry.name}`}
                          loading="lazy"
                          width={40}
                          height={40}
                          className="h-10 w-10 shrink-0 rounded-lg border border-border-custom/50 object-cover"
                        />
                      )}
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
                        <span className="text-xs font-semibold tabular-nums text-text-primary">
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
    </section>
  );
}
