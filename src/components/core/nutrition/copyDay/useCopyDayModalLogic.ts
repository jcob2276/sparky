import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useHaptics } from '../../../../hooks/useHaptics';
import { notify } from '../../../../lib/notify';
import { getYesterdayWarsaw } from '../../../../lib/date';
import {
  fetchAllTodayEntries,
  fetchRecentLoggedDates,
  fetchRecentLoggedDaysSummary,
  copyFoodEntriesToDate,
  type TodayFoodEntry,
  type RecentDaySummary,
} from '../../../../lib/health/composerTodayMealsApi';
import type { MealTypeId } from '../../../../lib/health/foodLogging';
import { mealLabelForType } from '../../../../lib/health/mealComposerUtils';

function toSummariesRecord(items?: RecentDaySummary[]): Record<string, RecentDaySummary> {
  const record: Record<string, RecentDaySummary> = {};
  for (const item of items ?? []) record[item.date] = item;
  return record;
}

function groupEntriesByMeal(entries: TodayFoodEntry[]): Map<MealTypeId, TodayFoodEntry[]> {
  const map = new Map<MealTypeId, TodayFoodEntry[]>();
  for (const entry of entries) {
    const type = (entry.meal_type as MealTypeId) || 'snack';
    const bucket = map.get(type) ?? [];
    bucket.push(entry);
    map.set(type, bucket);
  }
  return map;
}

export function useCopyDayModalLogic({
  isOpen,
  onClose,
  userId,
  targetDate,
  onCopied,
}: {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
  targetDate: string;
  onCopied: () => void;
}) {
  const haptics = useHaptics();
  const yesterday = useMemo(() => getYesterdayWarsaw(), []);

  const datesQuery = useQuery({
    queryKey: ['recent-logged-dates', userId, targetDate],
    queryFn: () => fetchRecentLoggedDates(userId, targetDate, 12),
    enabled: isOpen && !!userId,
  });

  const summariesQuery = useQuery({
    queryKey: ['recent-logged-days-summary', userId, targetDate],
    queryFn: () => fetchRecentLoggedDaysSummary(userId, targetDate, 12),
    enabled: isOpen && !!userId,
  });

  const summariesRecord = useMemo(() => toSummariesRecord(summariesQuery.data), [summariesQuery.data]);

  const availableDates = useMemo(() => {
    const fetched = datesQuery.data ?? [];
    return fetched.includes(yesterday) ? fetched : [yesterday, ...fetched];
  }, [datesQuery.data, yesterday]);

  const [selectedDate, setSelectedDate] = useState<string>(yesterday);
  const [targetMealType, setTargetMealType] = useState<MealTypeId | null>(null);
  const [deselectedIds, setDeselectedIds] = useState<Set<string>>(new Set());
  const [copying, setCopying] = useState(false);

  const handleSelectDate = (date: string) => {
    setSelectedDate(date);
    setDeselectedIds(new Set());
  };

  const entriesQuery = useQuery({
    queryKey: ['day-entries-for-copy', userId, selectedDate],
    queryFn: () => fetchAllTodayEntries(userId, selectedDate),
    enabled: isOpen && !!userId && !!selectedDate,
    placeholderData: (prev) => prev,
  });

  const entries = useMemo(() => entriesQuery.data ?? [], [entriesQuery.data]);
  const selectedEntries = useMemo(
    () => entries.filter((e) => !deselectedIds.has(e.id)),
    [entries, deselectedIds]
  );
  const selectedItemIds = useMemo(
    () => new Set(selectedEntries.map((e) => e.id)),
    [selectedEntries]
  );
  const selectedKcal = Math.round(selectedEntries.reduce((sum, e) => sum + (e.calories ?? 0), 0));
  const selectedProtein = Math.round(selectedEntries.reduce((sum, e) => sum + (e.protein ?? 0), 0) * 10) / 10;
  const groupedEntries = useMemo(() => groupEntriesByMeal(entries), [entries]);

  const handleToggleItem = (id: string) => {
    setDeselectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleToggleMeal = (mealType: MealTypeId) => {
    const mealItems = groupedEntries.get(mealType) ?? [];
    if (!mealItems.length) return;
    const allInMealSelected = mealItems.every((item) => !deselectedIds.has(item.id));
    setDeselectedIds((prev) => {
      const next = new Set(prev);
      for (const item of mealItems) {
        if (allInMealSelected) next.add(item.id);
        else next.delete(item.id);
      }
      return next;
    });
  };

  const handleToggleSelectAll = () => {
    haptics.selection();
    if (deselectedIds.size === 0) setDeselectedIds(new Set(entries.map((e) => e.id)));
    else setDeselectedIds(new Set());
  };

  const handleCopySelected = async () => {
    if (!selectedEntries.length || copying) return;
    setCopying(true);
    try {
      await copyFoodEntriesToDate(userId, entries, targetDate, {
        targetMealType: targetMealType ?? undefined,
        selectedIds: selectedItemIds,
      });
      haptics.success();
      const destLabel = targetMealType ? ` do: ${mealLabelForType(targetMealType)}` : '';
      notify(`Skopiowano ${selectedEntries.length} poz. (${selectedKcal} kcal)${destLabel}!`, 'success');
      onCopied();
      onClose();
    } catch (cause) {
      notify(cause instanceof Error ? cause.message : 'Nie udało się skopiować pozycji', 'error');
    } finally {
      setCopying(false);
    }
  };

  const handleCopyMeal = async (type: MealTypeId) => {
    const mealEntries = groupedEntries.get(type) ?? [];
    const mealSelected = mealEntries.filter((e) => !deselectedIds.has(e.id));
    const itemsToCopy = mealSelected.length > 0 ? mealSelected : mealEntries;
    if (!itemsToCopy.length || copying) return;
    setCopying(true);
    try {
      const dest = targetMealType ?? type;
      await copyFoodEntriesToDate(userId, itemsToCopy, targetDate, { targetMealType: dest });
      haptics.success();
      notify(`Skopiowano ${itemsToCopy.length} poz. do: ${mealLabelForType(dest)}!`, 'success');
      onCopied();
      onClose();
    } catch (cause) {
      notify(cause instanceof Error ? cause.message : 'Nie udało się skopiować posiłku', 'error');
    } finally {
      setCopying(false);
    }
  };

  return {
    yesterday,
    availableDates,
    selectedDate,
    handleSelectDate,
    summariesRecord,
    summariesLoading: summariesQuery.isLoading,
    entries,
    entriesLoading: entriesQuery.isLoading,
    entriesFetching: entriesQuery.isFetching,
    selectedItemIds,
    selectedKcal,
    selectedProtein,
    selectedCount: selectedEntries.length,
    groupedEntries,
    targetMealType,
    setTargetMealType,
    copying,
    handleToggleItem,
    handleToggleMeal,
    handleToggleSelectAll,
    handleCopySelected,
    handleCopyMeal,
  };
}
