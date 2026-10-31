import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { dashboardKeys } from '../../../lib/queryKeys';
import { fetchTodayLayout, saveTodayLayout } from '../../../lib/todayLayoutApi';
import type { TodayLayout } from '../../../lib/todayLayout';

export function useTodayLayout(userId: string) {
  const client = useQueryClient();
  const query = useQuery({
    queryKey: dashboardKeys.layout(userId),
    queryFn: () => fetchTodayLayout(userId),
    enabled: Boolean(userId),
    refetchOnWindowFocus: 'always',
  });
  const mutation = useMutation({
    mutationFn: (value: TodayLayout) => saveTodayLayout(userId, value),
    onSuccess: async value => {
      await client.cancelQueries({ queryKey: dashboardKeys.layout(userId) });
      client.setQueryData(dashboardKeys.layout(userId), value);
    },
  });
  return { query, save: mutation.mutateAsync, saving: mutation.isPending };
}
