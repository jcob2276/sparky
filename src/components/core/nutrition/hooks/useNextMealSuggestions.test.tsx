import { act, renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { type ReactNode } from 'react';
import { afterEach, expect, it, vi } from 'vitest';
import { useNextMealSuggestions } from './useNextMealSuggestions';
import { useMealComposerRefresh } from './useMealComposerRefresh';
import { fetchMealMemories } from '../../../../lib/health/nutritionTrackerApi';
vi.mock('../../../../lib/health/nutritionTrackerApi', () => ({ fetchMealMemories: vi.fn() }));
afterEach(() => vi.restoreAllMocks());
it('refreshes next-meal suggestions immediately after a meal is saved', async () => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const wrapper = ({ children }: { children: ReactNode }) => <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  vi.mocked(fetchMealMemories).mockResolvedValueOnce([]);
  const contextQuery = { refetch: vi.fn().mockResolvedValue({}) };
  const { result, unmount } = renderHook(() => ({
    next: useNextMealSuggestions({ userId: 'u', enabled: true, mealType: 'lunch', eatenKcal: 1000, eatenProtein: 80, targetKcal: 2400, targetProtein: 150, setDraftItems: vi.fn(), setMemoryName: vi.fn() }),
    refresh: useMealComposerRefresh({ queryClient: client, contextQuery, userId: 'u', logDate: '2026-10-27', mealType: 'lunch', setQualityPending: vi.fn() }),
  }), { wrapper });
  await waitFor(() => expect(client.getQueryState(['meal-memories', 'u'])?.status).toBe('success'));
  vi.mocked(fetchMealMemories).mockResolvedValue([{ id: 'm', name: 'Nowy posiłek', meal_type: 'lunch', confirmed_count: 1, items: [{ name: 'Ryż', grams: 200, per100: { calories: 130, protein: 2.5, carbs: 28, fat: 0.5 } }] }]);
  await act(() => result.current.refresh());
  await waitFor(() => expect(result.current.next.suggestions.map(s => s.name)).toContain('Nowy posiłek'));
  unmount(); client.clear();
});
