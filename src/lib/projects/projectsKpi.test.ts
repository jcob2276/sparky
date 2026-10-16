import { beforeEach, describe, expect, it, vi } from 'vitest';
import { upsertKpiEntry } from './projects';
import { supabase } from '../supabase';
import { invalidateGoalSpineCache } from '../goal/goalSpine.queries';

vi.mock('../supabase', () => ({
  supabase: {
    from: vi.fn(),
  },
}));

vi.mock('../goal/goalSpine.queries', () => ({
  invalidateGoalSpineCache: vi.fn(),
}));

describe('upsertKpiEntry', () => {
  const upsertMock = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(supabase.from).mockReturnValue({
      upsert: upsertMock,
    } as unknown as ReturnType<typeof supabase.from>);
  });

  it('upserts kpi_entries with conflict resolution and invalidates goal spine and direction caches', async () => {
    upsertMock.mockResolvedValueOnce({ error: null });

    await upsertKpiEntry('user-1', 'kpi-123', '2026-10-12', 42);

    expect(supabase.from).toHaveBeenCalledWith('kpi_entries');
    expect(upsertMock).toHaveBeenCalledWith(
      { user_id: 'user-1', kpi_id: 'kpi-123', week_start: '2026-10-12', value: 42 },
      { onConflict: 'kpi_id,week_start' }
    );
    expect(invalidateGoalSpineCache).toHaveBeenCalledWith('user-1');
  });

  it('throws error and does not invalidate cache when upsert fails', async () => {
    const dbError = new Error('Database upsert failure');
    upsertMock.mockResolvedValueOnce({ error: dbError });

    await expect(upsertKpiEntry('user-1', 'kpi-123', '2026-10-12', 42)).rejects.toThrow('Database upsert failure');
    expect(invalidateGoalSpineCache).not.toHaveBeenCalled();
  });
});
