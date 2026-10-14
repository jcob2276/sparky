import { invokeEdge } from '../supabase';
import type { HealthCoachWeeklyReview } from '@vanguard/domain';

export async function fetchHealthCoachWeeklyReview(params: {
  userId: string;
  weekStart: string;
  weekEnd: string;
}): Promise<HealthCoachWeeklyReview> {
  const response = await invokeEdge('analyze-training-load', {
    body: {
      action: 'weekly_review',
      userId: params.userId,
      weekStart: params.weekStart,
      weekEnd: params.weekEnd,
    },
  });
  if (!response?.review) throw new Error('Nie udało się pobrać podsumowania tygodniowego.');
  return response.review as HealthCoachWeeklyReview;
}
