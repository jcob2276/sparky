import { useQuery } from '@tanstack/react-query';
import { fetchSuperinvestorDetail, fetchSuperinvestorsOverview } from './superinvestorDetailService';

export function useSuperinvestorsOverview() {
  return useQuery({
    queryKey: ['investments', 'verified-fund-overview'], queryFn: fetchSuperinvestorsOverview,
    staleTime: 60_000, refetchInterval: 300_000, retry: 1,
  });
}
export function useSuperinvestorDetail(investorId: string) {
  return useQuery({
    queryKey: ['investments', 'verified-fund-detail', investorId],
    queryFn: () => fetchSuperinvestorDetail(investorId),
    staleTime: 60_000, refetchInterval: 300_000, retry: 1,
  });
}
