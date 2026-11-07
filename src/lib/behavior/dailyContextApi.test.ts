import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fetchDailyContext, setDailyContext } from './dailyContextApi';

const db = vi.hoisted(() => ({
  upsert: vi.fn(),
  deleteEq: vi.fn(),
  rows: [] as unknown[],
}));

vi.mock('../supabase', () => {
  const chain = (result: unknown) => {
    const q: Record<string, unknown> = {};
    for (const m of ['select', 'eq', 'in']) q[m] = () => q;
    q.then = (resolve: (v: unknown) => unknown) => resolve(result);
    return q;
  };
  return {
    supabase: {
      from: () => ({
        select: () => chain({ data: db.rows, error: null }),
        upsert: db.upsert,
        delete: () => ({ eq: (...a: unknown[]) => ({ eq: (...b: unknown[]) => ({ eq: (...c: unknown[]) => db.deleteEq(a, b, c) }) }) }),
      }),
    },
  };
});

describe('dailyContextApi', () => {
  beforeEach(() => { vi.clearAllMocks(); db.rows = []; });

  it('zapisuje jawne 0 jako log, a nie jako brak wpisu', async () => {
    db.upsert.mockResolvedValue({ error: null });
    await setDailyContext('u1', '2026-11-07', 'alcohol', 0);
    expect(db.upsert).toHaveBeenCalledWith(
      { user_id: 'u1', date: '2026-11-07', behavior_key: 'alcohol', value: 0 },
      { onConflict: 'user_id,date,behavior_key' },
    );
  });

  it('usuwa wpis dla null', async () => {
    db.deleteEq.mockResolvedValue({ error: null });
    await setDailyContext('u1', '2026-11-07', 'sick', null);
    expect(db.upsert).not.toHaveBeenCalled();
    expect(db.deleteEq).toHaveBeenCalledOnce();
  });

  it('rzuca błąd zapisu', async () => {
    db.upsert.mockResolvedValue({ error: { message: 'boom' } });
    await expect(setDailyContext('u1', '2026-11-07', 'travel', 1)).rejects.toMatchObject({ message: 'boom' });
  });

  it('pomija wiersze bez wartości i liczbowo normalizuje resztę', async () => {
    db.rows = [
      { date: '2026-11-07', behavior_key: 'alcohol', value: '2' },
      { date: '2026-11-07', behavior_key: 'stress', value: null },
    ];
    expect(await fetchDailyContext('u1', ['2026-11-07'])).toEqual([
      { date: '2026-11-07', behavior_key: 'alcohol', value: 2 },
    ]);
  });
});
