import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
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

function useCopyDayDates({
  isOpen,
  userId,
  targetDate,
  yesterday,
}: {
  isOpen: boolean;
  userId: string;
  targetDate: string;
  yesterday: string;
}) {
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

  return {
    availableDates,
    summariesRecord,
    summariesLoading: summariesQuery.isLoading,
  };
}

function useCopyDayEntries({
  isOpen,
  userId,
  selectedDate,
  deselectedIds,
}: {
  isOpen: boolean;
  userId: string;
  selectedDate: string;
  deselectedIds: Set<string>;
}) {
  const entriesQuery = useQuery({
    queryKey: ['day-entries-for-copy', userId, selectedDate],
    queryFn: () => fetchAllTodayEntries(userId, selectedDate),
    enabled: isOpen && !!userId && !!selectedDate,
    placeholderData: (prev) => prev,
  });

  const entries = useMemo(() => entriesQuery.data ?? [], [entriesQuery.data]);
  const selectedEntries = useMemo(
    () => entries.filter((e) => !deselectedIds.has(e.id)),
    [entries, deselectedIds],
  );
  const selectedItemIds = useMemo(
    () => new Set(selectedEntries.map((e) => e.id)),
    [selectedEntries],
  );
  const selectedKcal = useMemo(
    () => Math.round(selectedEntries.reduce((sum, e) => sum + (e.calories ?? 0), 0)),
    [selectedEntries],
  );
  const selectedProtein = useMemo(
    () => Math.round(selectedEntries.reduce((sum, e) => sum + (e.protein ?? 0), 0) * 10) / 10,
    [selectedEntries],
  );
  const groupedEntries = useMemo(() => groupEntriesByMeal(entries), [entries]);

  return {
    entries,
    entriesLoading: entriesQuery.isLoading,
    entriesFetching: entriesQuery.isFetching,
    selectedEntries,
    selectedItemIds,
    selectedKcal,
    selectedProtein,
    groupedEntries,
  };
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

  const { availableDates, summariesRecord, summariesLoading } = useCopyDayDates({
    isOpen,
    userId,
    targetDate,
    yesterday,
  });

  const [selectedDate, setSelectedDate] = useState<string>(yesterday);
  const [targetMealType, setTargetMealType] = useState<MealTypeId | null>(null);
  const [deselectedIds, setDeselectedIds] = useState<Set<string>>(new Set());
  const [copying, setCopying] = useState(false);

  // Reset state each time the modal is opened so re-opening always starts fresh
  const wasOpenRef = useRef(false);
  useEffect(() => {
    if (isOpen && !wasOpenRef.current) {
      setSelectedDate(yesterday);
      setDeselectedIds(new Set());
      setTargetMealType(null);
    }
    wasOpenRef.current = isOpen;
  }, [isOpen, yesterday]);

  const handleSelectDate = useCallback((date: string) => {
    setSelectedDate(date);
    setDeselectedIds(new Set());
  }, []);

  const {
    entries,
    entriesLoading,
    entriesFetching,
    selectedEntries,
    selectedItemIds,
    selectedKcal,
    selectedProtein,
    groupedEntries,
  } = useCopyDayEntries({
    isOpen,
    userId,
    selectedDate,
    deselectedIds,
  });


  const handleToggleItem = useCallback((id: string) => {
    setDeselectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const handleToggleMeal = useCallback((mealType: MealTypeId) => {
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
  }, [groupedEntries, deselectedIds]);

  const handleToggleSelectAll = useCallback(() => {
    haptics.selection();
    if (deselectedIds.size === 0) setDeselectedIds(new Set(entries.map((e) => e.id)));
    else setDeselectedIds(new Set());
  }, [haptics, deselectedIds, entries]);

  const handleCopySelected = useCallback(async () => {
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
  }, [selectedEntries, copying, userId, entries, targetDate, targetMealType, selectedItemIds, haptics, selectedKcal, onCopied, onClose]);

  const handleCopyMeal = useCallback(async (type: MealTypeId) => {
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
  }, [groupedEntries, deselectedIds, copying, targetMealType, userId, targetDate, haptics, onCopied, onClose]);

  return {
    yesterday,
    availableDates,
    selectedDate,
    handleSelectDate,
    summariesRecord,
    summariesLoading,
    entries,
    entriesLoading,
    entriesFetching,
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
