import { useQuery } from '@tanstack/react-query';
import { fetchDashboardData } from './dashboardService';
export function useDashboardData(watchlist: string[]) {
  return useQuery({ queryKey: ['investments', 'dashboard', watchlist], queryFn: () => fetchDashboardData(watchlist), staleTime: 60_000, retry: 1 });
}
