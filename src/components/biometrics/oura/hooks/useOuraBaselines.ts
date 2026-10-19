import { useQuery } from '@tanstack/react-query';
import { buildBaselineRows } from '../../../../lib/biometrics/ouraBaselines';
import { fetchOuraBaselineHistory } from '../../../../lib/biometrics/ouraBaselinesApi';

export function useOuraBaselines(userId: string, asOf: string | null) {
  return useQuery({
    queryKey: ['oura-baselines', userId, asOf],
    queryFn: async () => buildBaselineRows(await fetchOuraBaselineHistory(userId, asOf as string), asOf as string),
    enabled: !!userId && !!asOf,
    staleTime: 10 * 60 * 1000,
  });
}
