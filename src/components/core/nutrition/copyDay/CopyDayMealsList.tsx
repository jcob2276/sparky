import { memo } from 'react';
import Skeleton from '../../../ui/Skeleton';
import { MEAL_TYPES, type MealTypeId } from '../../../../lib/health/foodLogging';
import type { TodayFoodEntry } from '../../../../lib/health/composerTodayMealsApi';
import MealGroupCard from './MealGroupCard';

interface CopyDayMealsListProps {
  isLoading: boolean;
  hasEntries: boolean;
  groupedEntries: Map<MealTypeId, TodayFoodEntry[]>;
  selectedIds: Set<string>;
  onToggleItem: (id: string) => void;
  onToggleMeal: (mealType: MealTypeId) => void;
  copying: boolean;
  onCopyMeal: (type: MealTypeId) => void;
}

export default memo(function CopyDayMealsList({
  isLoading,
  hasEntries,
  groupedEntries,
  selectedIds,
  onToggleItem,
  onToggleMeal,
  copying,
  onCopyMeal,
}: CopyDayMealsListProps) {
  if (isLoading && !hasEntries) {
    return (
      <Skeleton variant="card" lines={3} className="py-6" />
    );
  }

  if (!hasEntries) {
    return (
      <div className="rounded-2xl border border-dashed border-border-custom/80 bg-surface-solid/20 p-8 text-center">
        <p className="text-sm font-bold text-text-primary">Brak zapisanych posiłków w wybranym dniu</p>
        <p className="mt-1 text-xs text-text-muted">Wybierz inną datę z listy powyżej lub sprawdź kalendarz</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {MEAL_TYPES.map((m) => {
        const mealItems = groupedEntries.get(m.id);
        if (!mealItems?.length) return null;
        return (
          <MealGroupCard
            key={m.id}
            mealType={m.id}
            entries={mealItems}
            selectedIds={selectedIds}
            onToggleItem={onToggleItem}
            onToggleMeal={onToggleMeal}
            copying={copying}
            onCopyMeal={onCopyMeal}
          />
        );
      })}
    </div>
  );
});

