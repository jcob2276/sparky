import { useQuery } from '@tanstack/react-query';
import { fetchGeneralMemoryData } from '../../../../lib/generalMemoryApi';

export type { GeneralViewPattern, GeneralViewWiki, GeneralViewCuriosity } from '../../../../lib/generalMemoryApi';

export function useGeneralViewData({ userId }: { userId: string }) {
  const { data, isLoading: loading, isError, refetch } = useQuery({
    queryKey: ['general-view-data', userId],
    queryFn: () => fetchGeneralMemoryData(userId),
    enabled: !!userId,
  });
  return {
    patterns: data?.patterns || [],
    wiki: data?.wiki || [],
    curiosity: data?.curiosity || [],
    recommendations: data?.recommendations || [],
    loading, isError, refetch,
  };
}
