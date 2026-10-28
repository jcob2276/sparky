import { useQuery } from '@tanstack/react-query';
import { fetchWikiSources } from '../../../../lib/wikiSourcesApi';
import { wikiSourcesKeys } from '../../../../lib/queryKeys';

export function useWikiSources(userId: string, pageId: string) {
  return useQuery({
    queryKey: wikiSourcesKeys.page(userId, pageId),
    queryFn: () => fetchWikiSources(userId, pageId),
    enabled: !!userId && !!pageId,
  });
}
