import { useQuery } from '@tanstack/react-query';
import { fetchGpwShortsData, fetchShortVsPriceChart } from './gpwShortsService';
import { orcaSelect } from './superinvestorsApi';
import type { DashboardSourceStatus } from './dashboardService';

export function useGpwShortsData(selection: string) {
  const overview = useQuery({ queryKey: ['investments', 'knf-shorts'], queryFn: fetchGpwShortsData,
    staleTime: 60000, refetchInterval: 300000, retry: 1 });
  const source = useQuery({ queryKey: ['investments', 'knf-source'],
    queryFn: () => orcaSelect<DashboardSourceStatus>('investment_source_status?source=eq.knf_shorts&limit=1', { strict: true }),
    staleTime: 60000, refetchInterval: 300000, retry: 1 });
  const selected = overview.data?.companies.find(c => c.ticker === selection) ?? overview.data?.companies[0];
  const chart = useQuery({ queryKey: ['investments', 'knf-chart', selected?.ticker, selected?.companyName],
    queryFn: () => fetchShortVsPriceChart(selected!.ticker, selected!.companyName), enabled: Boolean(selected),
    staleTime: 60000, refetchInterval: 300000, retry: 1 });
  return { overview, source, selected, chart };
}
