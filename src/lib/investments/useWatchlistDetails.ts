import { useQuery } from '@tanstack/react-query';
import { fetchWatchlistDetails } from './watchlistService';

export function useWatchlistDetails(watchlist: string[]) {
  return useQuery({ queryKey: ['investments', 'watchlistDetails', watchlist],
    queryFn: () => fetchWatchlistDetails(watchlist), staleTime: 60_000, refetchInterval: 300_000 });
}
