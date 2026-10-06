import { useQuery } from '@tanstack/react-query';
import { fetchSignalEvidence } from './signalsApi';

export function useSignalEvidence(ticker: string) {
  return useQuery({
    queryKey: ['investments', 'signalEvidence', ticker],
    queryFn: () => fetchSignalEvidence(ticker),
    enabled: Boolean(ticker), staleTime: 60_000, retry: 1,
  });
}
