import { describe, expect, it, vi } from 'vitest';
import { fetchPendingProposals } from './systemProposals';

const database = vi.hoisted(() => {
  const query = { select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), order: vi.fn() };
  return { query, from: vi.fn(() => query) };
});
vi.mock('./supabase', () => ({ supabase: { from: database.from } }));

describe('pending proposals read contract', () => {
  it('propagates read failure instead of replacing it with an empty result', async () => {
    database.query.order.mockResolvedValue({ data: null, error: { message: 'offline' } });
    await expect(fetchPendingProposals('owner')).rejects.toMatchObject({ message: 'offline' });
  });

  it('returns an empty list only after a successful read for the selected user', async () => {
    database.query.order.mockResolvedValue({ data: [], error: null });
    await expect(fetchPendingProposals('owner')).resolves.toEqual([]);
    expect(database.query.eq).toHaveBeenCalledWith('user_id', 'owner');
  });
});
