import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  maybeSingle: vi.fn(),
  upsert: vi.fn(),
}));

vi.mock('../supabase', () => ({
  supabase: {
    from: () => ({
      select: () => ({ eq: () => ({ eq: () => ({ maybeSingle: mocks.maybeSingle }) }) }),
    }),
  },
}));
vi.mock('./closerApi', () => ({ upsertCloserDailyLog: mocks.upsert }));

import { fetchCloserDay, saveCloserDayNumbers } from './closerDayApi';

beforeEach(() => {
  vi.clearAllMocks();
  mocks.upsert.mockResolvedValue({ id: 'saved' });
});

describe('saveCloserDayNumbers', () => {
  it('przenosi istniejące godziny pracy zamiast je zerować', async () => {
    mocks.maybeSingle.mockResolvedValue({ data: { work_hours: '6.5' }, error: null });
    await saveCloserDayNumbers('u1', '2026-10-21', { appointments: 4, dials: 41, salesCalls: 3, salesClosed: 1, note: 'ok' });
    expect(mocks.upsert).toHaveBeenCalledWith('u1', '2026-10-19', {
      date: '2026-10-21',
      dials: 41,
      appointments: 4,
      sales_calls: 3,
      sales_closed: 1,
      work_hours: 6.5,
      notes: 'ok',
    });
  });

  it('dla nowego dnia ustawia godziny na 0 i liczy poniedziałek tygodnia w Warszawie', async () => {
    mocks.maybeSingle.mockResolvedValue({ data: null, error: null });
    await saveCloserDayNumbers('u1', '2026-10-25', { appointments: 0, dials: 0, salesCalls: 0, salesClosed: 0, note: null });
    expect(mocks.upsert).toHaveBeenCalledWith('u1', '2026-10-19', expect.objectContaining({ work_hours: 0, notes: null }));
  });

  it('propaguje błąd odczytu zamiast zapisywać na ślepo', async () => {
    mocks.maybeSingle.mockResolvedValue({ data: null, error: new Error('offline') });
    await expect(saveCloserDayNumbers('u1', '2026-10-21', { appointments: 1, dials: 1, salesCalls: 1, salesClosed: 0, note: null }))
      .rejects.toThrow('offline');
    expect(mocks.upsert).not.toHaveBeenCalled();
  });
});

describe('fetchCloserDay', () => {
  it('zwraca null, gdy dnia nie ma', async () => {
    mocks.maybeSingle.mockResolvedValue({ data: null, error: null });
    await expect(fetchCloserDay('u1', '2026-10-21')).resolves.toBeNull();
  });
});
