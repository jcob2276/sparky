import { useCallback, useMemo, useState } from 'react';
import { useHaptics } from '../../../../hooks/useHaptics';
import { notify } from '../../../../lib/notify';
import { reestimateEntry } from '../../../../lib/health/reestimateEntry';
import {
  parseGrams,
  derivePer100,
  type RecentEntry,
} from './foodEntryUtils';
import {
  saveFoodCorrection,
  defaultMealType,
  updateFoodEntry,
  removeFoodEntry,
} from '../../../../lib/health/foodLogging';

interface UseFoodEntryEditOptions {
  userId: string | undefined;
  initialEditEntry?: RecentEntry;
  setError: (msg: string | null) => void;
  onSaved?: () => void;
  loadLists: () => Promise<void>;
}

export function useFoodEntryEdit({
  userId,
  initialEditEntry,
  setError,
  onSaved,
  loadLists,
}: UseFoodEntryEditOptions) {
  const haptics = useHaptics();

  const [editingEntry, setEditingEntry] = useState<RecentEntry | null>(
    initialEditEntry ?? null
  );
  const [editGrams, setEditGrams] = useState(
    initialEditEntry ? String(parseGrams(initialEditEntry.amount) ?? '') : '100'
  );
  const [editName, setEditNameRaw] = useState(initialEditEntry?.name ?? '');
  const [editEstimateNote, setEditEstimateNote] = useState<string | null>(null);
  const [editReestimating, setEditReestimating] = useState(false);
  const setEditName = useCallback((value: string) => {
    setEditNameRaw(value);
    setEditEstimateNote(null);
  }, []);
  const [editMealType, setEditMealType] = useState(
    initialEditEntry?.meal_type ?? defaultMealType()
  );
  const [editPer100, setEditPer100] = useState<{
    calories: number;
    protein: number;
    carbs: number | null;
    fat: number | null;
  } | null>(initialEditEntry ? derivePer100(initialEditEntry) : null);
  const [editSaving, setEditSaving] = useState(false);
  const [editDeleting, setEditDeleting] = useState(false);

  const editPreview = useMemo(() => {
    const g = parseGrams(`${editGrams} g`);
    if (g == null) return null;
    // This is the mass of the entire old portion, not a multiplier over invented grams.
    if (!editPer100) return editingEntry ? {
      calories: editingEntry.calories ?? 0, protein: editingEntry.protein ?? 0,
      carbs: editingEntry.carbs, fat: editingEntry.fat,
    } : null;
    return {
      calories: Math.round((editPer100.calories * g) / 100),
      protein: Math.round(((editPer100.protein * g) / 100) * 10) / 10,
      carbs:
        editPer100.carbs != null
          ? Math.round(((editPer100.carbs * g) / 100) * 10) / 10
          : null,
      fat:
        editPer100.fat != null
          ? Math.round(((editPer100.fat * g) / 100) * 10) / 10
          : null,
    };
  }, [editGrams, editPer100, editingEntry]);

  const openEditEntry = useCallback(
    (entry: RecentEntry) => {
      setEditingEntry(entry);
      setEditNameRaw(entry.name);
      setEditEstimateNote(null);
      setEditGrams(String(parseGrams(entry.amount) ?? ''));
      setEditMealType(entry.meal_type ?? defaultMealType());
      setEditPer100(derivePer100(entry));
      setError(null);
    },
    [setError]
  );

  /** Asks the model again for the (corrected) name — and the meal photo, when there is one — at the current portion. */
  const reestimateFromName = useCallback(async () => {
    const name = editName.trim();
    if (!name || !userId || editReestimating) return;
    const grams = parseGrams(`${editGrams} g`);
    if (grams == null) { setError('Podaj masę całej porcji przed przeliczeniem.'); return; }
    setEditReestimating(true);
    setError(null);
    try {
      const result = await reestimateEntry({ userId, name, grams, mealGroupId: editingEntry?.meal_group_id });
      if (!result) {
        setError('Nie udało się przeliczyć — opisz dokładniej');
        return;
      }
      setEditPer100(result.per100);
      const kcal = Math.round((result.per100.calories * grams) / 100);
      const protein = Math.round(((result.per100.protein * grams) / 100) * 10) / 10;
      const note = `Przeliczone${result.viaPhoto ? ' ze zdjęcia' : ''} dla „${name}” (${grams} g): ${kcal} kcal · ${protein} g B`;
      setEditEstimateNote(note);
      notify(note, 'success');
      haptics.success();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Przeliczenie nie powiodło się');
    } finally {
      setEditReestimating(false);
    }
  }, [editName, editGrams, editingEntry, userId, editReestimating, haptics, setError]);

  const saveEntryEdit = useCallback(async () => {
    if (!editingEntry || !userId || editSaving || !editPreview) return;
    setEditSaving(true);
    setError(null);
    try {
      const newGrams = parseGrams(`${editGrams} g`);
      if (newGrams == null) throw new Error('Podaj prawidłową masę całej porcji.');
      const newName = editName.trim() || editingEntry.name;
      const nameChanged = newName !== editingEntry.name;
      await updateFoodEntry(userId, editingEntry.id, {
        ...(nameChanged ? { name: newName } : {}),
        calories: editPreview.calories,
        protein: editPreview.protein,
        carbs: editPreview.carbs,
        fat: editPreview.fat,
        meal_type: editMealType,
        amount: `${newGrams} g`,
      });
      const origGrams = parseGrams(editingEntry.amount);
      if (nameChanged || origGrams == null || Math.abs(newGrams - origGrams) >= 5) {
        saveFoodCorrection(userId, editingEntry.name, newGrams, nameChanged ? newName : null).catch((e) =>
          console.warn('[FoodEntryModal] saveFoodCorrection failed', e)
        );
      }
      setEditingEntry(null);
      onSaved?.();
      await loadLists();
    } catch (err: unknown) {
      setError(err instanceof Error ? (err as Error).message : 'Aktualizacja nie powiodła się');
    } finally {
      setEditSaving(false);
    }
  }, [editingEntry, userId, editName, editGrams, editMealType, editPreview, editSaving, onSaved, loadLists, setError]);

  const deleteEntry = useCallback(async () => {
    if (!editingEntry || !userId || editDeleting) return;
    haptics.light();
    setEditDeleting(true);
    setError(null);
    try {
      await removeFoodEntry(userId, editingEntry.id);
      setEditingEntry(null);
      onSaved?.();
      await loadLists();
    } catch (err: unknown) {
      setError(err instanceof Error ? (err as Error).message : 'Usunięcie nie powiodło się');
    } finally {
      setEditDeleting(false);
    }
  }, [editingEntry, userId, editDeleting, onSaved, loadLists, haptics, setError]);

  return {
    editName,
    setEditName,
    editEstimateNote,
    editReestimating,
    reestimateFromName,
    editingEntry,
    setEditingEntry,
    editGrams,
    setEditGrams,
    editMealType,
    setEditMealType,
    editPer100,
    setEditPer100,
    editSaving,
    editDeleting,
    editPreview,
    openEditEntry,
    saveEntryEdit,
    deleteEntry,
  };
}
