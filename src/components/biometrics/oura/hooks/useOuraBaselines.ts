import { useQuery } from '@tanstack/react-query';
import { buildBaselineRows } from '../../../../lib/biometrics/ouraBaselines';
import { fetchOuraBaselineHistory } from '../../../../lib/biometrics/ouraBaselinesApi';
import { biometricsKeys } from '../../../../lib/queryKeys';

export function useOuraBaselines(userId: string, asOf: string | null) {
  return useQuery({
    queryKey: biometricsKeys.ouraBaselines(userId, asOf),
    queryFn: async () => buildBaselineRows(await fetchOuraBaselineHistory(userId, asOf as string), asOf as string),
    enabled: !!userId && !!asOf,
    staleTime: 10 * 60 * 1000,
  });
}
