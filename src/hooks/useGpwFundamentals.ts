import { useQuery } from '@tanstack/react-query';
import { fetchGpwFundamentalsList, type GpwCompanyFundamental } from '../lib/investments/gpwFundamentalsService';

const EMPTY_COMPANIES: GpwCompanyFundamental[] = [];
const EMPTY_MEDIANS = new Map<string, number>();

export function useGpwFundamentals() {
  const query = useQuery({
    queryKey: ['investments', 'gpw-fundamentals'], queryFn: fetchGpwFundamentalsList,
    staleTime: 5 * 60_000, retry: false,
  });
  return {
    companies: query.data?.companies ?? EMPTY_COMPANIES,
    sectorMedians: query.data?.sectorMedians ?? EMPTY_MEDIANS,
    refreshedDate: query.data?.refreshedDate ?? null,
    loading: query.isLoading, error: query.error,
    retry: () => { void query.refetch(); },
  };
}
