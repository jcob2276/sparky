import { act, cleanup, renderHook } from '@testing-library/react';
import type { Session } from '@supabase/supabase-js';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { useStore } from '../store/useStore';
import { useAppAuthSession } from './useAppAuthSession';

const auth = vi.hoisted(() => ({
  getSession: vi.fn(), unsubscribe: vi.fn(),
  callback: (_event: string, _session: Session | null) => {},
}));
vi.mock('../lib/supabase', () => ({ supabase: { auth: {
  getSession: auth.getSession,
  onAuthStateChange: (callback: typeof auth.callback) => {
    auth.callback = callback;
    return { data: { subscription: { unsubscribe: auth.unsubscribe } } };
  },
} } }));

function session(id: string): Session {
  return {
    access_token: 'test', refresh_token: 'test', expires_in: 3600, token_type: 'bearer',
    user: { id, aud: 'authenticated', app_metadata: {}, user_metadata: {}, created_at: '2026-10-17T00:00:00Z' },
  };
}

beforeEach(() => {
  vi.useFakeTimers(); vi.clearAllMocks(); useStore.setState({ session: null });
});
afterEach(() => { cleanup(); vi.clearAllTimers(); vi.useRealTimers(); useStore.setState({ session: null }); });

it('does not resurrect an old session when sign-out arrives before restoration finishes', async () => {
  let finish!: (value: { data: { session: Session }; error: null }) => void;
  auth.getSession.mockReturnValue(new Promise(resolve => { finish = resolve; }));
  const { result } = renderHook(useAppAuthSession);
  act(() => auth.callback('SIGNED_OUT', null));
  await act(async () => { finish({ data: { session: session('old') }, error: null }); });
  expect(result.current.session).toBeNull();
  expect(result.current.loading).toBe(false);
});

it('does not clear a newly signed-in account when the older bootstrap read rejects', async () => {
  let fail!: (error: Error) => void;
  auth.getSession.mockReturnValue(new Promise((_resolve, reject) => { fail = reject; }));
  const { result } = renderHook(useAppAuthSession);
  const current = session('new');
  act(() => auth.callback('SIGNED_IN', current));
  await act(async () => { fail(new Error('old request failed')); });
  expect(result.current.session).toEqual(current);
});

it('restores the session when no newer auth event has arrived', async () => {
  const current = session('owner');
  auth.getSession.mockResolvedValue({ data: { session: current }, error: null });
  const { result } = renderHook(useAppAuthSession);
  await act(async () => {});
  expect(result.current.session).toEqual(current);
  expect(result.current.loading).toBe(false);
});

it('ignores a restoration response after cleanup and unsubscribes', async () => {
  let finish!: (value: { data: { session: Session }; error: null }) => void;
  auth.getSession.mockReturnValue(new Promise(resolve => { finish = resolve; }));
  const { unmount } = renderHook(useAppAuthSession);
  unmount();
  await act(async () => { finish({ data: { session: session('old') }, error: null }); });
  expect(useStore.getState().session).toBeNull();
  expect(auth.unsubscribe).toHaveBeenCalledOnce();
});
