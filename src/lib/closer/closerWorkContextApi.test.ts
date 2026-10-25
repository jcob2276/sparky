import { beforeEach, describe, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({ upsert: vi.fn(), single: vi.fn() }));
vi.mock('../supabase', () => ({ supabase: { from: () => ({ upsert: mocks.upsert }) } }));
import { saveCloserWorkContext } from './closerDayApi';
beforeEach(() => { vi.clearAllMocks(); mocks.upsert.mockReturnValue({ select: () => ({ single: mocks.single }) }); });
describe('work context writes', () => {
  it('writes only context and owner/date, leaving numeric totals untouched', async () => {
    mocks.single.mockResolvedValue({ data: { id: 'day' }, error: null });
    await saveCloserWorkContext('owner', '2026-10-25', { work_energy: 2, work_pressure: 4, notes: 'Mój dzień' });
    const [payload, options] = mocks.upsert.mock.calls[0];
    expect(payload).toEqual({ user_id: 'owner', date: '2026-10-25', work_energy: 2, work_pressure: 4, notes: 'Mój dzień', updated_at: expect.any(String) });
    expect(options).toEqual({ onConflict: 'user_id,date' });
  });
  it('rejects invalid ratings and propagates persistence failures', async () => {
    await expect(saveCloserWorkContext('owner', '2026-10-25', { work_energy: 6, work_pressure: null, notes: '' })).rejects.toThrow('1–5');
    expect(mocks.upsert).not.toHaveBeenCalled();
    mocks.single.mockResolvedValue({ data: null, error: new Error('denied') });
    await expect(saveCloserWorkContext('owner', '2026-10-25', { work_energy: null, work_pressure: null, notes: '' })).rejects.toThrow('denied');
  });
});
