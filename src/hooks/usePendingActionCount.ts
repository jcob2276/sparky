import { useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { fetchActionCenterCount } from '../lib/actionCenterApi';
import { syncFrictionProposals } from '../lib/systemProposals';
import { actionCenterKeys } from '../lib/queryKeys';
import { useUserId } from '../store/useStore';

export function usePendingActionCount() {
  const userId = useUserId() ?? '';
  const queryClient = useQueryClient();
  const countQuery = useQuery({
    queryKey: actionCenterKeys.count(userId),
    queryFn: async () => {
      if (!userId) return 0;
      await syncFrictionProposals(userId);
      return fetchActionCenterCount(userId);
    },
    enabled: !!userId,
    refetchInterval: 60_000,
  });
  const reload = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: actionCenterKeys.count(userId) });
  }, [queryClient, userId]);
  return { count: countQuery.data ?? 0, reload };
}
