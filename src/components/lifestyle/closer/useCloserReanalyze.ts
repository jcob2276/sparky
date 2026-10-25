import { useMutation, useQueryClient } from '@tanstack/react-query';
import { reanalyzeCloserCall } from '../../../lib/closer/closerCallsApi';
import { closerKeys } from '../../../lib/queryKeys';

/** Przelicza analizę jednej rozmowy i odświeża wszystko, co pokazuje rozmowy closera (analiza, biblioteka). */
export function useCloserReanalyze(callId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => reanalyzeCloserCall(callId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: closerKeys.all }),
  });
}
