import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, expect, it, vi } from 'vitest';
import type { ReactNode } from 'react';
import { lookupFoodBarcode } from '../../../../lib/health/foodSearch';
import { useFoodEntrySearch } from './useFoodEntrySearch';
import type { FoodBase } from './foodEntryUtils';

vi.mock('../../../../lib/health/foodSearch', () => ({ lookupFoodBarcode: vi.fn() }));
vi.mock('../../../../lib/notify', () => ({ notify: vi.fn() }));
vi.mock('../../../../hooks/useHaptics', () => ({ useHaptics: () => ({ success: vi.fn(), error: vi.fn() }) }));

beforeEach(() => vi.mocked(lookupFoodBarcode).mockReset());

it('ignores a duplicate submission and discards results after the scanner closes', async () => {
  const product = { name: 'Ryż', calories: 100, protein: 2, carbs: 20, fat: 1 } as FoodBase;
  let finish!: (food: FoodBase) => void;
  vi.mocked(lookupFoodBarcode).mockReturnValue(new Promise((resolve) => { finish = resolve; }));
  const onBarcodePicked = vi.fn();
  const client = new QueryClient();
  const wrapper = ({ children }: { children: ReactNode }) => <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  const { result } = renderHook(() => useFoodEntrySearch({
    userId: undefined, setError: vi.fn(), searchInputRef: { current: null }, onBarcodePicked,
  }), { wrapper });

  act(() => result.current.setScannerOpen(true));
  act(() => {
    void result.current.lookupBarcode('5901234123457');
    void result.current.lookupBarcode('5901234123457');
  });
  await waitFor(() => expect(lookupFoodBarcode).toHaveBeenCalled());
  expect(lookupFoodBarcode).toHaveBeenCalledTimes(1);

  act(() => result.current.setScannerOpen(false));
  act(() => result.current.setScannerOpen(true));
  await act(async () => { finish(product); });
  await waitFor(() => expect(client.getMutationCache().getAll()[0]?.state.status).toBe('success'));
  expect(onBarcodePicked).not.toHaveBeenCalled();
  expect(result.current.scannerOpen).toBe(true);
  expect(result.current.scanLookingUp).toBe(false);
});

it('reports a failed lookup and accepts an explicit retry', async () => {
  vi.mocked(lookupFoodBarcode).mockRejectedValueOnce(new Error('Offline')).mockResolvedValueOnce(null);
  const setError = vi.fn();
  const client = new QueryClient();
  const wrapper = ({ children }: { children: ReactNode }) => <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  const { result } = renderHook(() => useFoodEntrySearch({
    userId: undefined, setError, searchInputRef: { current: null },
  }), { wrapper });

  act(() => result.current.setScannerOpen(true));
  act(() => { result.current.lookupBarcode('5901234123457'); });
  await waitFor(() => expect(setError).toHaveBeenLastCalledWith('Wyszukiwanie po kodzie nie powiodło się'));
  expect(result.current.scannerOpen).toBe(true);
  act(() => { result.current.lookupBarcode('5901234123457'); });
  await waitFor(() => expect(result.current.scannerOpen).toBe(false));
  expect(lookupFoodBarcode).toHaveBeenCalledTimes(2);
});
