import { useQuery } from '@tanstack/react-query';
import { fetchPortfolioPerformance } from './portfolioPerformance';
import type { PortfolioPosition } from './jakubPortfolioStorage';

export function usePortfolioPerformance(scope: 'jakub' | 'kondzio', positions: PortfolioPosition[]) {
  const key = positions.map(p => `${p.ticker}:${p.market}:${Math.round(p.currentValue)}`).sort().join('|');
  return useQuery({ queryKey: ['investments', 'portfolioPerformance', scope, key],
    queryFn: () => fetchPortfolioPerformance(positions), enabled: positions.length > 0,
    staleTime: 120_000, refetchInterval: 300_000, retry: 1 });
}
