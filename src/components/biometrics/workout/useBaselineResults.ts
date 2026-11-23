import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { fetchBaselineResults, removeBaselineVideo, saveBaselineResult, uploadBaselineVideo, type BaselinePatch } from '../../../lib/health/baselineApi';
import type { BaselineResult } from '../../../lib/health/baselineTests';
import { notify } from '../../../lib/notify';

const key = (userId: string) => ['baseline-results', userId] as const;

/** Wyniki pomiarów wstępnych z optymistyczną aktualizacją: wpis widać od razu, błąd cofa zmianę. */
export function useBaselineResults(userId: string) {
  const queryClient = useQueryClient();
  const query = useQuery({ queryKey: key(userId), queryFn: () => fetchBaselineResults(userId) });

  const save = useMutation({
    mutationFn: ({ testKey, patch }: { testKey: string; patch: BaselinePatch }) => saveBaselineResult(userId, testKey, patch),
    onMutate: async ({ testKey, patch }) => {
      await queryClient.cancelQueries({ queryKey: key(userId) });
      const previous = queryClient.getQueryData<BaselineResult[]>(key(userId));
      queryClient.setQueryData<BaselineResult[]>(key(userId), (rows = []) => {
        const empty: BaselineResult = { test_key: testKey, main_set: null, max_value: null, skipped: null, video_path: null, video_url: null };
        return rows.some((r) => r.test_key === testKey)
          ? rows.map((r) => (r.test_key === testKey ? { ...r, ...patch } : r))
          : [...rows, { ...empty, ...patch }];
      });
      return { previous };
    },
    onError: (_error, _vars, context) => {
      if (context?.previous) queryClient.setQueryData(key(userId), context.previous);
      notify('Nie udało się zapisać wyniku. Spróbuj ponownie.', 'error');
    },
  });

  const refresh = () => queryClient.invalidateQueries({ queryKey: key(userId) });
  const upload = async (testKey: string, file: File, previousPath: string | null) => {
    await uploadBaselineVideo(userId, testKey, file, previousPath);
    await refresh();
  };
  const removeVideo = async (testKey: string, path: string) => {
    try { await removeBaselineVideo(userId, testKey, path); await refresh(); } catch { notify('Nie udało się usunąć nagrania.', 'error'); }
  };

  return { results: query.data ?? [], isLoading: query.isLoading, error: query.error, save: (testKey: string, patch: BaselinePatch) => save.mutate({ testKey, patch }), upload, removeVideo };
}
