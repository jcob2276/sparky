import { beforeEach, describe, expect, it, vi } from 'vitest';
import { invokeEdge } from './supabase';
import { computeDailyStrain, syncCalendar, syncOura, syncStrava } from './syncApi';

vi.mock('./supabase', () => ({ invokeEdge: vi.fn() }));
beforeEach(() => vi.resetAllMocks());

describe('sync response contracts', () => {
  it('rejects a disconnected Calendar response even when HTTP invocation resolves', async () => {
    vi.mocked(invokeEdge).mockResolvedValue({ ok: false, skipped: true, reason: 'google_token_invalid' });
    await expect(syncCalendar('owner')).rejects.toThrow('google_token_invalid');
  });

  it('does not report an unconfigured Oura integration as synchronized', async () => {
    vi.mocked(invokeEdge).mockResolvedValue({ ok: true, skipped: true, reason: 'oura_not_configured' });
    await expect(syncOura('owner')).rejects.toThrow('oura_not_configured');
  });

  it('propagates failed computation for the requested user despite top-level success', async () => {
    vi.mocked(invokeEdge).mockResolvedValue({ success: true, results: [{ user_id: 'owner', error: 'write failed' }] });
    await expect(computeDailyStrain('owner')).rejects.toThrow('write failed');
  });

  it.each([null, {}, { message: 'not an acknowledgement' }])('does not infer success from an invalid acknowledgement: %j', async (response) => {
    vi.mocked(invokeEdge).mockResolvedValue(response as Record<string, unknown>);
    await expect(syncStrava()).rejects.toThrow();
  });

  it.each([{ ok: true, synced: 0 }, { success: true, total_upserted: 3 }])('accepts explicit success: %j', async (response) => {
    vi.mocked(invokeEdge).mockResolvedValue(response);
    await expect(syncStrava()).resolves.toBeUndefined();
  });
});
