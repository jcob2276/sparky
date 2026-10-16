import { useQuery, useQueryClient } from '@tanstack/react-query';
import { fetchPendingClarificationRequests } from '../lib/actionCenterApi';
import { actionCenterKeys } from '../lib/queryKeys';
import { useUserId } from '../store/useStore';
import { usePendingProposals } from './usePendingProposals';

export function useActionCenterData(open: boolean, onUpdated?: () => void) {
  const userId = useUserId() ?? '';
  const queryClient = useQueryClient();
  const proposals = usePendingProposals(userId, open);
  const clarifications = useQuery({
    queryKey: actionCenterKeys.clarifications(userId),
    queryFn: () => fetchPendingClarificationRequests(userId),
    enabled: open && !!userId,
  });

  const handleProposalResolved = async (id: string, status: 'confirmed' | 'dismissed') => {
    await proposals.resolve(id, status);
    onUpdated?.();
  };
  const handleAnswered = () => {
    void queryClient.invalidateQueries({ queryKey: actionCenterKeys.clarifications(userId) });
    void queryClient.invalidateQueries({ queryKey: actionCenterKeys.count(userId) });
    onUpdated?.();
  };

  return {
    proposals: proposals.data ?? [], clarifications: clarifications.data ?? [],
    loading: proposals.isLoading || clarifications.isLoading,
    error: proposals.error ?? clarifications.error,
    handleProposalResolved, handleAnswered,
  };
}
