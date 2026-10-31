import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { fetchTodayLayout, saveTodayLayout } from '../../../lib/todayLayoutApi';
import { act, cleanup, renderHook, waitFor } from '@testing-library/react';
import { createElement, type ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useTodayLayout } from './useTodayLayout';

vi.mock('../../../lib/supabase', async () => {
  const { createClient } = await import('@supabase/supabase-js');
  return { supabase: createClient('https://example.supabase.co', 'test-key', {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { fetch: (...args) => fetch(...args) },
  }) };
});

const saved = { version: 1, sections: [{ id: 'agenda', visible: true }, { id: 'vision', visible: false }] };
let records: Record<string, string>;
let failRead: boolean;
let failSave: boolean;
let delayRead: boolean;
let releaseRead: (() => void) | null;

beforeEach(() => {
  records = {}; failRead = false; failSave = false; delayRead = false; releaseRead = null;
  vi.stubGlobal('fetch', async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = new URL(input instanceof Request ? input.url : String(input));
    expect(url.pathname).toBe('/rest/v1/vanguard_preferences');
    if ((init?.method ?? 'GET') === 'GET') {
      expect(url.searchParams.get('key')).toBe('eq.ui:today_layout');
      if (failRead) return Response.json({ message: 'Read unavailable' }, { status: 503 });
      const owner = url.searchParams.get('user_id')?.replace('eq.', '') ?? '';
      const response = Response.json(records[owner] ? [{ value: records[owner] }] : []);
      if (delayRead) {
        delayRead = false;
        return new Promise<Response>(resolve => { releaseRead = () => resolve(response); });
      }
      return response;
    }
    if (failSave) return Response.json({ message: 'Write denied' }, { status: 403 });
    const body = JSON.parse(String(init?.body));
    expect(url.searchParams.get('on_conflict')).toBe('user_id,key');
    expect(body.key).toBe('ui:today_layout');
    expect(body.is_active).toBe(false);
    records[body.user_id] = body.value;
    return new Response(null, { status: 201 });
  });
});
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

it('reloads saved order and visibility for the owning account only', async () => {
  await saveTodayLayout('alice', saved);
  const alice = await fetchTodayLayout('alice');
  const bob = await fetchTodayLayout('bob');
  expect(alice.sections.slice(0, 2)).toEqual(saved.sections);
  expect(bob.sections[0]).toEqual({ id: 'vision', visible: true });
});

it('rejects read and write failures instead of reporting a saved default', async () => {
  failRead = true;
  await expect(fetchTodayLayout('alice')).rejects.toThrow('Read unavailable');
  failSave = true;
  await expect(saveTodayLayout('alice', saved)).rejects.toThrow('Write denied');
  expect(records).toEqual({});
});

it('keeps a newly saved layout when an earlier background read finishes later', async () => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const { result } = renderHook(() => useTodayLayout('alice'), {
    wrapper: ({ children }: { children: ReactNode }) => createElement(QueryClientProvider, { client }, children),
  });
  await waitFor(() => expect(result.current.query.isSuccess).toBe(true));
  delayRead = true;
  let pending: Promise<unknown> | undefined;
  act(() => { pending = result.current.query.refetch(); });
  await waitFor(() => expect(releaseRead).not.toBeNull());
  await act(async () => { await result.current.save({ version: 1, sections: [{ id: 'agenda', visible: true }] }); });
  await act(async () => { releaseRead!(); await pending; });
  expect(result.current.query.data?.sections[0].id).toBe('agenda');
});
