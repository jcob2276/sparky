import { useQuery } from '@tanstack/react-query';
import { fetchDisclosureBasket } from './basketSimulationService';

export function useDisclosureBasket(size: 5 | 10 | 20) {
  return useQuery({
    queryKey: ['investments', 'disclosure-basket', size], queryFn: () => fetchDisclosureBasket(size),
    staleTime: 60_000, refetchInterval: 300_000, retry: 1,
  });
}
