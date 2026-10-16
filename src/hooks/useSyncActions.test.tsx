import { act, renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { invokeEdge } from '../lib/supabase';
import { notify } from '../lib/notify';
import { useSyncActions } from './useSyncActions';

vi.mock('../lib/supabase', () => ({ invokeEdge: vi.fn() }));
vi.mock('../lib/notify', () => ({ notify: vi.fn() }));

function setup(userId = 'owner') {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const onRefresh = vi.fn();
  const hook = renderHook(({ userId }) => useSyncActions({ userId, accessToken: undefined, onRefresh, setSyncing: vi.fn() }), {
    initialProps: { userId },
    wrapper: ({ children }) => <QueryClientProvider client={client}>{children}</QueryClientProvider>,
  });
  return { ...hook, onRefresh };
}

beforeEach(() => {
  vi.resetAllMocks();
  localStorage.clear();
  localStorage.setItem('vanguard_last_unified_sync_time', String(Date.now()));
  localStorage.setItem('sparky_last_unified_sync_time_owner', String(Date.now()));
});

describe('manual unified synchronization feedback', () => {
  it('offers reconnection for a revoked Google token and never claims full success', async () => {
    vi.mocked(invokeEdge).mockImplementation(async (name) => name.includes('calendar')
      ? { ok: false, skipped: true, reason: 'google_token_invalid' } : { ok: true });
    const { result } = setup();
    await act(async () => { await result.current.syncCalendar(); });
    expect(notify).toHaveBeenCalledWith(expect.stringContaining('Google Calendar rozłączony'), 'error', expect.objectContaining({
      action: expect.objectContaining({ label: 'Połącz ponownie' }),
    }));
    expect(vi.mocked(notify).mock.calls.some(([, kind]) => kind === 'success')).toBe(false);
  });

  it('does not count skipped unconfigured integrations as successful refreshes', async () => {
    vi.mocked(invokeEdge).mockResolvedValue({ ok: true, skipped: true, reason: 'not_configured' });
    const { result, onRefresh } = setup();
    await act(async () => { await result.current.syncCalendar(); });
    expect(onRefresh).not.toHaveBeenCalled();
    expect(vi.mocked(notify).mock.calls.some(([, kind]) => kind === 'error')).toBe(true);
    expect(vi.mocked(notify).mock.calls.some(([, kind]) => kind === 'success')).toBe(false);
  });

  it('does not let a previous account throttle synchronization for the next account', async () => {
    vi.mocked(invokeEdge).mockResolvedValue({ ok: true });
    const { rerender } = setup();
    expect(invokeEdge).not.toHaveBeenCalled();
    rerender({ userId: 'bob' });
    await waitFor(() => expect(invokeEdge).toHaveBeenCalledWith('sync?service=calendar', expect.objectContaining({ body: { userId: 'bob' } })));
  });

  it('shows reconnection feedback independently for each account', async () => {
    vi.mocked(invokeEdge).mockImplementation(async (name) => name.includes('calendar')
      ? { ok: false, skipped: true, reason: 'google_token_invalid' } : { ok: true });
    const { result, rerender } = setup();
    await act(async () => { await result.current.syncCalendar(); });
    localStorage.setItem('sparky_last_unified_sync_time_bob', String(Date.now()));
    rerender({ userId: 'bob' });
    await act(async () => { await result.current.syncCalendar(); });
    expect(vi.mocked(notify).mock.calls.filter(([message]) => message.includes('Google Calendar rozłączony'))).toHaveLength(2);
  });

  it.each(['not-a-number', String(Date.now() + 86_400_000)])('recovers from an invalid stored synchronization time: %s', async (stored) => {
    localStorage.setItem('sparky_last_unified_sync_time_owner', stored);
    vi.mocked(invokeEdge).mockResolvedValue({ ok: true });
    setup();
    await waitFor(() => expect(invokeEdge).toHaveBeenCalled());
  });

  it('does not manually synchronize without a signed-in user', async () => {
    vi.mocked(invokeEdge).mockResolvedValue({ ok: true });
    const { result } = setup('');
    await act(async () => { await result.current.syncCalendar(); });
    expect(invokeEdge).not.toHaveBeenCalled();
  });
});
