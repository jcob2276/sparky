import { useQuery } from '@tanstack/react-query';
import { fetchGpwStocksList, type GpwStockItem } from '../lib/investments/gpwCompaniesService';
const EMPTY: GpwStockItem[] = [];
export function useGpwCompanies() {
  const query = useQuery({ queryKey: ['investments', 'gpw-companies'], queryFn: fetchGpwStocksList,
    staleTime: 60000, retry: 1 });
  return { stocks: query.data?.stocks ?? EMPTY, summary: query.data?.summary ?? null,
    loading: query.isLoading, error: query.error, retry: () => { void query.refetch(); } };
}
