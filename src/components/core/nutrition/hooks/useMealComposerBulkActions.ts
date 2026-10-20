import { useCallback } from 'react';
import { notify } from '../../../../lib/notify';
import { copyFoodEntriesToDate, deleteFoodEntry, type TodayFoodEntry } from '../../../../lib/health/composerTodayMealsApi';
import { mealLabelForType } from '../../../../lib/health/mealComposerUtils';

interface Params {
  userId: string | undefined;
  saving: boolean;
  setSaving: (value: boolean) => void;
  allTodayEntries: TodayFoodEntry[] | undefined;
  todayStr: string;
  setLogDateAndResetTime: (date: string) => void;
  refreshAfterSave: () => Promise<void>;
}

export function useMealComposerBulkActions({
  userId, saving, setSaving, allTodayEntries, todayStr, setLogDateAndResetTime, refreshAfterSave,
}: Params) {
  const copyEntireDayToToday = useCallback(async () => {
    if (!userId || !allTodayEntries?.length || saving) return;
    setSaving(true);
    try {
      await copyFoodEntriesToDate(userId, allTodayEntries, todayStr);
      setLogDateAndResetTime(todayStr);
      await refreshAfterSave();
      notify('Skopiowano posiłki do dzisiaj!', 'success');
    } catch (err) {
      notify(err instanceof Error ? err.message : 'Błąd kopiowania', 'error');
    } finally {
      setSaving(false);
    }
  }, [allTodayEntries, refreshAfterSave, saving, setLogDateAndResetTime, setSaving, todayStr, userId]);

  const copyMealToToday = useCallback(async (sourceMealType: string) => {
    if (!userId || !allTodayEntries?.length || saving) return;
    const mealEntries = allTodayEntries.filter((e) => e.meal_type === sourceMealType);
    if (!mealEntries.length) return;
    setSaving(true);
    try {
      await copyFoodEntriesToDate(userId, mealEntries, todayStr, sourceMealType);
      setLogDateAndResetTime(todayStr);
      await refreshAfterSave();
      notify(`Skopiowano ${mealLabelForType(sourceMealType)} do dzisiaj!`, 'success');
    } catch (err) {
      notify(err instanceof Error ? err.message : 'Błąd kopiowania', 'error');
    } finally {
      setSaving(false);
    }
  }, [allTodayEntries, refreshAfterSave, saving, setLogDateAndResetTime, setSaving, todayStr, userId]);

  const deleteEntry = useCallback(async (entryId: string) => {
    if (!userId || saving) return;
    try {
      await deleteFoodEntry(userId, entryId);
      await refreshAfterSave();
      notify('Usunięto wpis', 'success');
    } catch (err) {
      notify(err instanceof Error ? err.message : 'Błąd usuwania', 'error');
    }
  }, [userId, saving, refreshAfterSave]);

  return { copyEntireDayToToday, copyMealToToday, deleteEntry };
}
