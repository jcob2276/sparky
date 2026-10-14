import { useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchCoachDecision, requestCoachAdjustment } from '../../../lib/health/coachDecision';
import { getTodayWarsaw } from '../../../lib/date';
import { biometricsKeys } from '../../../lib/queryKeys';
import { notify } from '../../../lib/notify';
export function useCoachDecision(userId: string, onPrepared: () => void) {
  const client = useQueryClient(), key = useRef<string | null>(null);
  const query = useQuery({ queryKey: biometricsKeys.coachDecision(userId, getTodayWarsaw()), queryFn: () => fetchCoachDecision(userId), staleTime: 60000, retry: false });
  const mutation = useMutation({ mutationFn: async () => {
    key.current ??= crypto.randomUUID();
    return requestCoachAdjustment(key.current);
  }, onSuccess: async () => {
    await client.invalidateQueries({ queryKey: ['training-plan', userId] });
    onPrepared();
  }, onError: (error: Error) => notify(error.message, 'error') });
  return { decision: query.data ?? null, loading: query.isPending, error: query.error?.message ?? null,
    busy: mutation.isPending, prepared: mutation.isSuccess, propose: () => mutation.mutate() };
}
