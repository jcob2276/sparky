import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { searchDisclosures } from './disclosureSearch';

export function useDisclosureSearch(query: string) {
  const [debounced, setDebounced] = useState(query);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(query), 180);
    return () => clearTimeout(timer);
  }, [query]);
  const result = useQuery({
    queryKey: ['investments', 'disclosureSearch', debounced],
    queryFn: () => searchDisclosures(debounced), enabled: debounced.trim().length >= 2,
    staleTime: 60_000, retry: 1,
  });
  return { results: query === debounced ? result.data ?? [] : [],
    searching: query.trim().length >= 2 && (query !== debounced || result.isFetching),
    error: query === debounced ? result.error : null };
}
