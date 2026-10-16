import { useQuery, useQueryClient } from '@tanstack/react-query';
import { fetchPendingProposals, resolveProposal, syncFrictionProposals } from '../lib/systemProposals';
import { actionCenterKeys } from '../lib/queryKeys';

export function usePendingProposals(userId: string, enabled = true) {
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: actionCenterKeys.proposals(userId),
    queryFn: async () => {
      await syncFrictionProposals(userId);
      return fetchPendingProposals(userId);
    },
    enabled: enabled && !!userId,
  });

  const resolve = async (id: string, status: 'confirmed' | 'dismissed') => {
    await resolveProposal(id, status);
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: actionCenterKeys.proposals(userId) }),
      queryClient.invalidateQueries({ queryKey: actionCenterKeys.count(userId) }),
    ]);
  };

  return { ...query, resolve };
}
