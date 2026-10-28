import { act, renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { type ReactNode } from 'react';
import { expect, it, vi } from 'vitest';
import { useDayReview } from './useDayReview';
import { notify } from '../../../../lib/notify';
vi.mock('../../../../lib/notify', () => ({ notify: vi.fn() }));
vi.mock('../../../../lib/health/nutritionTrackerApi', () => ({ fetchNutritionDayReviews: vi.fn().mockResolvedValue([]), saveNutritionDayReview: vi.fn().mockRejectedValue(new Error('offline')) }));
it('rolls back and reports a failed completeness save instead of silently losing the decision', async () => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  const wrapper = ({ children }: { children: ReactNode }) => <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  const { result, unmount } = renderHook(() => useDayReview('u', '2026-10-27'), { wrapper });
  await waitFor(() => expect(client.getQueryState(['nutrition-day-review', 'u', '2026-10-27'])?.status).toBe('success'));
  act(() => result.current.setStatus('complete'));
  await waitFor(() => expect(notify).toHaveBeenCalledWith(expect.stringMatching(/zapis|offline/i), 'error'));
  expect(result.current.status).toBe('unknown');
  unmount(); client.clear();
});
