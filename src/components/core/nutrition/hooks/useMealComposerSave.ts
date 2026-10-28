import { useCallback, useEffect, useRef, type Dispatch, type MutableRefObject, type SetStateAction } from 'react';
import { notify } from '../../../../lib/notify';
import { quickAddFavorite, type FoodFavoriteRow } from '../../../../lib/health/foodLogging';
import type { MealDraftItem } from '../../../../lib/health/nutritionTracker';
import { confirmMealCapture, type MealCaptureSource } from '../../../../lib/health/nutritionTrackerApi';
import { upsertUserPortionsFromDraft } from '../../../../lib/health/userPortionsApi';
import type { useFoodEntrySearch } from './useFoodEntrySearch';

interface Params {
  userId: string | undefined;
  saving: boolean;
  setSaving: Dispatch<SetStateAction<boolean>>;
  setError: Dispatch<SetStateAction<string | null>>;
  logDate: string;
  mealType: string;
  search: Pick<ReturnType<typeof useFoodEntrySearch>, 'setQuery'>;
  scannedPhotoIdRef: MutableRefObject<string | null>;
  draftItems: MealDraftItem[] | null;
  setDraftItems: Dispatch<SetStateAction<MealDraftItem[] | null>>;
  setText: Dispatch<SetStateAction<string>>;
  setMemoryName: Dispatch<SetStateAction<string>>;
  setSearchOpen: Dispatch<SetStateAction<boolean>>;
  refreshAfterSave: () => Promise<void>;
}

/** Persisting a meal: confirmed drafts (confirmMealCapture) and one-tap favorites. */
export function useMealComposerSave({
  userId, saving, setSaving, setError, logDate, mealType, search, scannedPhotoIdRef, draftItems,
  setDraftItems, setText, setMemoryName, setSearchOpen, refreshAfterSave,
}: Params) {
  const pendingCaptureRef = useRef<{
    userId: string; id: string; itemIds: string[]; date: string; loggedAt?: string; source: MealCaptureSource;
  } | null>(null);
  useEffect(() => {
    if (!draftItems?.length) pendingCaptureRef.current = null;
  }, [draftItems]);

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
      // Keep the same operation even if the response, time update or portion write fails.
      const pending = pendingCaptureRef.current;
      const capture = pending?.userId === userId && items.some(item => pending.itemIds.includes(item.id))
        ? pending : {
          userId, id: (source === 'photo' ? scannedPhotoIdRef.current : null) ?? crypto.randomUUID(),
          itemIds: items.map(item => item.id), date: logDate, loggedAt: options?.loggedAt, source,
        };
      pendingCaptureRef.current = capture;
      // The pending operation now owns the photo ID; a replacement text draft must not inherit it.
      scannedPhotoIdRef.current = null;
      const { id: captureId, date, loggedAt } = capture;
      await confirmMealCapture({
        userId,
        date,
        mealType,
        source: capture.source,
        items,
        memoryName: options?.memoryName,
        loggedAt,
        captureId,
      });
      const toRemember = items
        .filter((item) => rememberIds.has(item.id))
        .map((item) => ({
          name: item.name,
          grams: item.grams,
          unit: item.parseMeta?.unit,
        }));
      if (toRemember.length) {
        try {
          await upsertUserPortionsFromDraft(userId, toRemember);
        } catch (cause) {
          throw new Error('Posiłek zapisany, ale nie udało się zapamiętać porcji. Ponów zapis, aby dokończyć.', { cause });
        }
      }
      pendingCaptureRef.current = null;
      scannedPhotoIdRef.current = null;
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
