import { describe, expect, it, vi } from 'vitest';
import { fetchHealthCoachWeeklyReview } from './healthCoachReviewApi';
import * as supabaseModule from '../supabase';

describe('healthCoachReviewApi', () => {
  it('invokes analyze-training-load with weekly_review action and returns review', async () => {
    const mockReview = {
      weekStart: '2026-10-12',
      weekEnd: '2026-10-18',
      goalProgress: [],
      adherence: {
        plannedSessionsCount: 4,
        completedSessionsCount: 4,
        skippedSessionsCount: 0,
        unrecordedSessionsCount: 0,
        cardioKm: 12,
        strengthSets: 18,
        adherenceRate: 1,
        note: 'Kompletne sesje',
      },
      coverage: {},
      decisions: [],
      nextWeekProposal: { action: 'keep', rationale: 'Stabilny plan', changesSummary: [] },
      assessmentStatus: 'evaluated',
      summary: 'Wszystko wykonane',
    };

    vi.spyOn(supabaseModule, 'invokeEdge').mockResolvedValueOnce({
      success: true,
      review: mockReview,
    });

    const result = await fetchHealthCoachWeeklyReview({
      userId: 'test-user',
      weekStart: '2026-10-12',
      weekEnd: '2026-10-18',
    });

    expect(result.weekStart).toBe('2026-10-12');
    expect(result.adherence.completedSessionsCount).toBe(4);
    expect(result.adherence.cardioKm).toBe(12);
  });
});
