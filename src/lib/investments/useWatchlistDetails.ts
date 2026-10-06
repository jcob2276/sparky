import { useQuery } from '@tanstack/react-query';
import { fetchWatchlistDetails } from './watchlistService';
import { fetchWatchlistSuggestions } from './watchlistSearch';

export function useWatchlistDetails(watchlist: string[]) {
  return useQuery({ queryKey: ['investments', 'watchlistDetails', watchlist],
    queryFn: () => fetchWatchlistDetails(watchlist), staleTime: 60_000, refetchInterval: 300_000 });
}

export function useWatchlistSuggestions() {
  return useQuery({ queryKey: ['investments', 'watchlistSuggestions'],
    queryFn: fetchWatchlistSuggestions, staleTime: 300_000, retry: 1 });
}
