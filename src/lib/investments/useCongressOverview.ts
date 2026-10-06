import { useQuery } from '@tanstack/react-query';
import { fetchCongressOverview } from './congressService';
import { orcaSelect } from './superinvestorsApi';

interface SourceStatus {
  checked_at: string; last_success_at: string | null; latest_disclosure_date: string | null;
  status: 'ok' | 'partial' | 'error';
}
export interface HouseDisclosureDocument {
  id: string; filer_name: string; filing_date: string; source_url: string;
  parse_status: 'pending' | 'parsed' | 'error'; transaction_count: number | null;
}

export function useCongressOverview(options: Parameters<typeof fetchCongressOverview>[0]) {
  const query = useQuery({
    queryKey: ['investments', 'congress', options],
    queryFn: async () => {
      const [overview, statuses, documents] = await Promise.all([
        fetchCongressOverview(options),
        orcaSelect<SourceStatus>('investment_source_status?source=eq.house_clerk&limit=1', { strict: true }),
        orcaSelect<HouseDisclosureDocument>('house_disclosures?select=id,filer_name,filing_date,source_url,parse_status,transaction_count&order=filing_date.desc,doc_id.desc&limit=10', { strict: true }),
      ]);
      return { overview, status: statuses[0] ?? null, documents };
    },
    staleTime: 60_000, refetchInterval: 300_000, retry: 1,
  });
  return { overview: query.data?.overview ?? null, sourceStatus: query.data?.status ?? null,
    documents: query.data?.documents ?? [],
    loading: query.isPending, error: query.error, refresh: query.refetch };
}
