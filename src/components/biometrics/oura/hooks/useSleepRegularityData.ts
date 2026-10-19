import { useQuery } from '@tanstack/react-query';
import { getTodayWarsaw } from '../../../../lib/date';
import { buildSleepRegularity } from '../../../../lib/biometrics/ouraSleepRegularity';
import { fetchSleepRegularityRows } from '../../../../lib/biometrics/ouraSleepRegularityApi';

export function useSleepRegularityData(userId: string) {
  const today = getTodayWarsaw();
  return useQuery({
    queryKey: ['oura-sleep-regularity', userId, today],
    queryFn: async () => buildSleepRegularity(await fetchSleepRegularityRows(userId, today), today),
    enabled: !!userId,
    staleTime: 5 * 60 * 1000,
  });
}
