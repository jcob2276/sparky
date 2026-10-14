import { useQuery } from '@tanstack/react-query';
import { fetchHealthCoachWeeklyReview } from '../../../lib/health/healthCoachReviewApi';
import type { HealthCoachWeeklyReview } from '@vanguard/domain';

export function useHealthCoachWeeklyReview(userId: string | undefined, weekStart: string, weekEnd: string) {
  return useQuery<HealthCoachWeeklyReview>({
    queryKey: ['health-coach-weekly-review', userId, weekStart, weekEnd],
    queryFn: () => fetchHealthCoachWeeklyReview({ userId: userId!, weekStart, weekEnd }),
    enabled: Boolean(userId && weekStart && weekEnd),
    staleTime: 5 * 60 * 1000,
  });
}
