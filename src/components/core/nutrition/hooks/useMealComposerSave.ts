import { useCallback, type Dispatch, type MutableRefObject, type SetStateAction } from 'react';
import { notify } from '../../../../lib/notify';
import { quickAddFavorite, type FoodFavoriteRow } from '../../../../lib/health/foodLogging';
import type { MealDraftItem } from '../../../../lib/health/nutritionTracker';
import { confirmMealCapture } from '../../../../lib/health/nutritionTrackerApi';
import { upsertUserPortionsFromDraft } from '../../../../lib/health/userPortionsApi';
import type { useFoodEntrySearch } from './useFoodEntrySearch';

interface Params {
  userId: string | undefined;
  saving: boolean;
  setSaving: Dispatch<SetStateAction<boolean>>;
  setError: Dispatch<SetStateAction<string | null>>;
  logDate: string;
  mealType: string;
  search: ReturnType<typeof useFoodEntrySearch>;
  scannedPhotoIdRef: MutableRefObject<string | null>;
  setDraftItems: Dispatch<SetStateAction<MealDraftItem[] | null>>;
  setText: Dispatch<SetStateAction<string>>;
  setMemoryName: Dispatch<SetStateAction<string>>;
  setSearchOpen: Dispatch<SetStateAction<boolean>>;
  refreshAfterSave: () => Promise<void>;
}

/** Persisting a meal: confirmed drafts (confirmMealCapture) and one-tap favorites. */
export function useMealComposerSave({
  userId, saving, setSaving, setError, logDate, mealType, search, scannedPhotoIdRef,
  setDraftItems, setText, setMemoryName, setSearchOpen, refreshAfterSave,
}: Params) {
  const saveDraft = useCallback(async (
    items: MealDraftItem[],
    source: 'text' | 'photo' | 'repeat' | 'search',
    rememberIds: Set<string> = new Set(),
    options?: { memoryName?: string; loggedAt?: string },
  ) => {
    if (!userId || !items.length || saving) return;
    setSaving(true);
    setError(null);
    try {
      const captureId = source === 'photo' ? scannedPhotoIdRef.current ?? undefined : undefined;
      await confirmMealCapture({
        userId,
        date: logDate,
        mealType,
        source,
        items,
        memoryName: options?.memoryName,
        loggedAt: options?.loggedAt,
        captureId,
      });
      scannedPhotoIdRef.current = null;
      const toRemember = items
        .filter((item) => rememberIds.has(item.id))
        .map((item) => ({
          name: item.name,
          grams: item.grams,
          unit: item.parseMeta?.unit,
        }));
      if (toRemember.length) {
        await upsertUserPortionsFromDraft(userId, toRemember);
      }
      setDraftItems(null);
      setText('');
      setMemoryName('');
      search.setQuery('');
      setSearchOpen(false);
      await refreshAfterSave();
      notify(`Zapisano posiłek (${items.length} ${items.length === 1 ? 'pozycja' : 'pozycje'})`, 'success');
    } catch (cause: unknown) {
      const message = cause instanceof Error ? cause.message : 'Zapis nie powiódł się';
      setError(message);
      notify(message, 'error');
    } finally {
      setSaving(false);
    }
  }, [userId, saving, logDate, mealType, refreshAfterSave, search, scannedPhotoIdRef,
    setSaving, setError, setDraftItems, setText, setMemoryName, setSearchOpen]);

  const handleFavorite = useCallback(async (fav: Omit<FoodFavoriteRow, 'barcode'> & { barcode?: string | null }) => {
    if (!userId || saving) return;
    setSaving(true);
    try {
      await quickAddFavorite(userId, fav, logDate, mealType);
      await refreshAfterSave();
      notify(fav.name, 'success');
    } catch (cause: unknown) {
      notify(cause instanceof Error ? cause.message : 'Błąd', 'error');
    } finally {
      setSaving(false);
    }
  }, [userId, saving, logDate, mealType, refreshAfterSave, setSaving]);

  return { saveDraft, handleFavorite };
}
