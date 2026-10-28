import { useRef, useState } from 'react';
import { act, cleanup, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import type { MealDraftItem } from '../../../../lib/health/nutritionTracker';
import { useMealComposerSave } from './useMealComposerSave';

const transport = vi.hoisted(() => ({ rpc: vi.fn(), update: vi.fn(), updateTime: vi.fn(), portions: vi.fn() }));
vi.mock('../../../../lib/supabase', () => ({ supabase: {
  rpc: transport.rpc,
  from: () => ({ update: transport.update }),
} }));
vi.mock('../../../../lib/health/nutritionSideEffects', () => ({ scheduleNutritionRefresh: vi.fn() }));
vi.mock('../../../../lib/health/userPortionsApi', () => ({ upsertUserPortionsFromDraft: transport.portions }));
vi.mock('../../../../lib/notify', () => ({ notify: vi.fn() }));

const items: MealDraftItem[] = [{
  id: 'rice', name: 'Ryż', grams: 200, calories: 260, protein: 5, carbs: 56, fat: 1,
  source: 'library', confidence: 'high',
}];
const photoId = '11111111-1111-4111-8111-111111111111';

function useSaveHarness(source: 'text' | 'photo', logDate = '2026-10-28') {
  const [draftItems, setDraftItems] = useState<MealDraftItem[] | null>(items);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scannedPhotoIdRef = useRef(source === 'photo' ? photoId : null);
  const save = useMealComposerSave({
    userId: 'owner', saving, setSaving, setError, logDate, mealType: 'lunch',
    search: { setQuery: vi.fn() }, scannedPhotoIdRef, draftItems,
    setDraftItems, setText: vi.fn(), setMemoryName: vi.fn(), setSearchOpen: vi.fn(),
    refreshAfterSave: vi.fn().mockResolvedValue(undefined),
  });
  return { ...save, draftItems, setDraftItems, error, scannedPhotoIdRef };
}

beforeEach(() => {
  vi.resetAllMocks();
  transport.rpc.mockResolvedValue({ data: [], error: null });
  transport.update.mockImplementation(() => ({ eq: () => ({ eq: transport.updateTime }) }));
  transport.updateTime.mockResolvedValue({ error: null });
  transport.portions.mockResolvedValue(undefined);
});
afterEach(cleanup);

it.each([
  ['text', 'time'], ['photo', 'time'], ['text', 'portions'], ['photo', 'portions'],
  ['text', 'response'], ['photo', 'response'],
] as const)('retries %s with the same capture after a failed %s step', async (source, failure) => {
  if (failure === 'time') transport.updateTime.mockResolvedValueOnce({ error: { message: 'offline' } });
  if (failure === 'portions') transport.portions.mockRejectedValueOnce(new Error('offline'));
  // The server may commit before the RPC response is lost.
  if (failure === 'response') transport.rpc.mockRejectedValueOnce(new Error('response lost'));
  const { result } = renderHook(() => useSaveHarness(source));
  const save = () => result.current.saveDraft(items, result.current.scannedPhotoIdRef.current ? 'photo' : 'text', new Set(['rice']), {
    loggedAt: '2026-10-28T12:00:00.000Z',
  });

  await act(save);
  expect(result.current.draftItems).toEqual(items);
  expect(result.current.error).toBeTruthy();
  const firstCapture = transport.rpc.mock.calls[0][1].p_capture_id;
  if (source === 'photo') expect(firstCapture).toBe(photoId);
  await act(save);

  expect(transport.rpc.mock.calls[1][1].p_capture_id).toBe(firstCapture);
  expect(transport.rpc.mock.calls[1][1].p_source).toBe(source);
  expect(result.current.draftItems).toBeNull();
  expect(result.current.error).toBeNull();
  expect(result.current.scannedPhotoIdRef.current).toBeNull();
  expect(transport.updateTime).toHaveBeenLastCalledWith('meal_group_id', firstCapture);
  expect(transport.portions).toHaveBeenLastCalledWith('owner', [{ name: 'Ryż', grams: 200, unit: undefined }]);

  await act(() => { result.current.setDraftItems(items); });
  await act(save);
  expect(transport.rpc.mock.calls[2][1].p_capture_id).not.toBe(firstCapture);
});

it('reports a committed meal when saving its time fails', async () => {
  transport.updateTime.mockResolvedValueOnce({ error: { message: 'offline' } });
  const { result } = renderHook(() => useSaveHarness('text'));
  await act(() => result.current.saveDraft(items, 'text', new Set(), { loggedAt: '2026-10-28T12:00:00Z' }));
  expect(result.current.error).toMatch(/posiłek zapisany.*godzin/i);
});

it('reports a committed meal when remembering its portion fails', async () => {
  transport.portions.mockRejectedValueOnce(new Error('offline'));
  const { result } = renderHook(() => useSaveHarness('text'));
  await act(() => result.current.saveDraft(items, 'text', new Set(['rice'])));
  expect(result.current.error).toMatch(/posiłek zapisany.*porcj/i);
});

it('starts a new capture after a failed draft is dismissed', async () => {
  transport.rpc.mockRejectedValueOnce(new Error('offline'));
  const { result } = renderHook(() => useSaveHarness('text'));
  await act(() => result.current.saveDraft(items, 'text'));
  const firstCapture = transport.rpc.mock.calls[0][1].p_capture_id;
  await act(() => { result.current.setDraftItems(null); });
  await act(() => { result.current.setDraftItems(items); });
  await act(() => result.current.saveDraft(items, 'text'));
  expect(transport.rpc.mock.calls[1][1].p_capture_id).not.toBe(firstCapture);
});

it.each(['text', 'photo'] as const)('starts a new capture when a failed %s draft is replaced', async (source) => {
  transport.portions.mockRejectedValueOnce(new Error('offline'));
  const { result } = renderHook(() => useSaveHarness(source));
  await act(() => result.current.saveDraft(items, source, new Set(['rice'])));
  const firstCapture = transport.rpc.mock.calls[0][1].p_capture_id;
  const replacement = [{ ...items[0], id: 'new-rice', name: 'Nowy ryż' }];
  const newPhotoId = '22222222-2222-4222-8222-222222222222';
  await act(() => {
    result.current.setDraftItems(replacement);
    result.current.scannedPhotoIdRef.current = source === 'photo' ? newPhotoId : null;
  });
  await act(() => result.current.saveDraft(replacement, source));
  const secondCapture = transport.rpc.mock.calls[1][1].p_capture_id;
  expect(secondCapture).not.toBe(firstCapture);
  if (source === 'photo') expect(secondCapture).toBe(newPhotoId);
});

it.each(['time', 'portions'] as const)('preserves the original day and time when retrying %s after midnight', async (failure) => {
  if (failure === 'time') transport.updateTime.mockResolvedValueOnce({ error: { message: 'offline' } });
  if (failure === 'portions') transport.portions.mockRejectedValueOnce(new Error('offline'));
  const { result, rerender } = renderHook(({ date }) => useSaveHarness('text', date), {
    initialProps: { date: '2026-10-28' },
  });
  await act(() => result.current.saveDraft(items, 'text', new Set(['rice']), { loggedAt: '2026-10-28T22:59:00Z' }));
  rerender({ date: '2026-10-29' });
  await act(() => result.current.saveDraft(items, 'text', new Set(['rice']), { loggedAt: '2026-10-28T23:01:00Z' }));
  expect(transport.rpc.mock.calls[1][1].p_date).toBe('2026-10-28');
  expect(transport.update).toHaveBeenLastCalledWith({ logged_at: '2026-10-28T22:59:00Z' });
});

it('does not link a replacement text draft to the failed photo capture', async () => {
  transport.updateTime.mockResolvedValueOnce({ error: { message: 'offline' } });
  const { result } = renderHook(() => useSaveHarness('photo'));
  await act(() => result.current.saveDraft(items, 'photo', new Set(), { loggedAt: '2026-10-28T12:00:00Z' }));
  const replacement = [{ ...items[0], id: 'new-text-rice' }];
  await act(() => { result.current.setDraftItems(replacement); });
  const source = result.current.scannedPhotoIdRef.current ? 'photo' : 'text';
  await act(() => result.current.saveDraft(replacement, source));
  expect(transport.rpc.mock.calls[1][1].p_capture_id).not.toBe(photoId);
  expect(transport.rpc.mock.calls[1][1].p_source).toBe('text');
});
