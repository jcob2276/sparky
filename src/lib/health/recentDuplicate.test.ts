import { beforeEach, expect, it, vi } from 'vitest';
import { confirmIfRecentDuplicate } from './recentDuplicate';

const mocks = vi.hoisted(() => ({ limit: vi.fn(), confirm: vi.fn() }));
vi.mock('../supabase', () => {
  const chain: Record<string, unknown> = {};
  for (const key of ['select', 'eq', 'gte', 'in']) chain[key] = () => chain;
  chain.limit = mocks.limit;
  return { supabase: { from: () => chain } };
});
vi.mock('../notify', () => ({ confirmDialog: mocks.confirm }));

beforeEach(() => {
  vi.resetAllMocks();
});

it('allows saving when nothing similar was logged recently', async () => {
  mocks.limit.mockResolvedValue({ data: [], error: null });
  expect(await confirmIfRecentDuplicate('u', '2026-11-24', ['Jajecznica'])).toBe(true);
  expect(mocks.confirm).not.toHaveBeenCalled();
});

it('asks before saving the same meal again and respects the answer', async () => {
  mocks.limit.mockResolvedValue({ data: [{ name: 'Jajecznica' }], error: null });
  mocks.confirm.mockResolvedValueOnce(false).mockResolvedValueOnce(true);
  expect(await confirmIfRecentDuplicate('u', '2026-11-24', ['Jajecznica'])).toBe(false);
  expect(await confirmIfRecentDuplicate('u', '2026-11-24', ['Jajecznica'])).toBe(true);
});

it('never blocks saving when the lookup fails', async () => {
  mocks.limit.mockRejectedValue(new Error('offline'));
  expect(await confirmIfRecentDuplicate('u', '2026-11-24', ['Jajecznica'])).toBe(true);
});
