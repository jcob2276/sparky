import { useQuery } from '@tanstack/react-query';
import { fetchCompanyDetailData } from '../lib/investments/companyDetailService';

export function useCompanyDetail(ticker: string, initialName: string | undefined, market: 'us' | 'gpw') {
  const query = useQuery({
    queryKey: ['investments', 'company-detail', market, ticker, initialName],
    queryFn: () => fetchCompanyDetailData(ticker, initialName, market),
    staleTime: 60000,
    retry: 1,
  });
  return { data: query.data ?? null, loading: query.isLoading,
    error: query.error?.message ?? null, retry: () => { void query.refetch(); } };
}
