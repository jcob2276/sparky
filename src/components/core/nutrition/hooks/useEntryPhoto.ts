import { useCallback, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { notify } from '../../../../lib/notify';
import { prepareVisionUpload } from '../../../../lib/imageThumbnail';
import { assignEntryMealGroup } from '../../../../lib/health/foodLogging';
import { deleteMealPhoto, fetchMealPhotoUrls, saveMealPhoto } from '../../../../lib/health/mealPhotoStore';
import type { RecentEntry } from './foodEntryUtils';

const URL_STALE_MS = 30 * 60 * 1000;

/** Photo of the meal an entry belongs to: show, replace, add (also to a lone entry) and remove. */
export function useEntryPhoto(
  userId: string | undefined,
  entry: RecentEntry,
  onGroupAssigned?: () => void,
) {
  const queryClient = useQueryClient();
  const [groupId, setGroupId] = useState(entry.meal_group_id ?? null);
  const [busy, setBusy] = useState(false);

  const { data } = useQuery({
    queryKey: ['meal-photo', userId, groupId],
    queryFn: async () => (await fetchMealPhotoUrls(userId!, [groupId!]))[groupId!] ?? null,
    enabled: !!userId && !!groupId,
    initialData: entry.photoUrl ?? undefined,
    staleTime: URL_STALE_MS,
  });

  const refreshViews = useCallback(
    () => Promise.all([
      queryClient.invalidateQueries({ queryKey: ['meal-photo'] }),
      queryClient.invalidateQueries({ queryKey: ['meal-photo-urls'] }),
    ]),
    [queryClient],
  );

  const setPhoto = useCallback(async (file: File) => {
    if (!userId || busy) return;
    setBusy(true);
    try {
      const image = await prepareVisionUpload(file);
      const targetGroup = groupId ?? crypto.randomUUID();
      if (!groupId) await assignEntryMealGroup(userId, entry.id, targetGroup);
      await saveMealPhoto(userId, targetGroup, image);
      setGroupId(targetGroup);
      await refreshViews();
      if (!groupId) onGroupAssigned?.();
    } catch (cause: unknown) {
      notify(cause instanceof Error ? cause.message : 'Nie udało się zapisać zdjęcia', 'error');
    } finally {
      setBusy(false);
    }
  }, [userId, busy, groupId, entry.id, refreshViews, onGroupAssigned]);

  const removePhoto = useCallback(async () => {
    if (!userId || !groupId || busy) return;
    setBusy(true);
    try {
      await deleteMealPhoto(userId, groupId);
      queryClient.setQueryData(['meal-photo', userId, groupId], null);
      await refreshViews();
    } catch (cause: unknown) {
      notify(cause instanceof Error ? cause.message : 'Nie udało się usunąć zdjęcia', 'error');
    } finally {
      setBusy(false);
    }
  }, [userId, groupId, busy, queryClient, refreshViews]);

  return { photoUrl: data ?? null, busy, setPhoto, removePhoto };
}
