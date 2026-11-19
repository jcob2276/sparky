import { createElement, type ReactNode } from 'react';
import { cleanup, renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { afterEach, expect, it, vi } from 'vitest';
import { useBankData } from './bankApi';

const source = vi.hoisted(() => ({ fail: false, selections: [] as string[] }));
vi.mock('../supabase', async () => {
  const { createClient } = await import('@supabase/supabase-js');
  return { invokeEdge: vi.fn(), supabase: createClient('https://bank.example.test', 'test-public-key', {
    auth: { persistSession: false, autoRefreshToken: false }, global: { fetch: fetchBank },
  }) };
});
async function fetchBank(input: Parameters<typeof fetch>[0], init?: RequestInit) {
  const req = new Request(input, init);
  const url = new URL(req.url);
  expect(req.method).toBe('GET');
  expect(url.searchParams.get('user_id')).toBe('eq.owner');
  if (url.pathname.endsWith('/bank_connections')) return Response.json(null);
  if (url.pathname.endsWith('/bank_accounts')) {
    return Response.json([{ id: 'a', currency: 'PLN', balance: 10, hidden: false }]);
  }
  if (url.pathname.endsWith('/bank_category_rules')) return Response.json([]);
  expect(url.searchParams.get('account_id')).toBe('in.(a)');
  source.selections.push(url.searchParams.get('select') ?? '');
  expect(url.searchParams.get('created_at')).toMatch(/^lte\./);
  const offset = Number(url.searchParams.get('offset') ?? 0);
  if (source.fail && offset > 0) return Response.json({ message: 'page unavailable' }, { status: 500 });
  const size = Math.min(100, 1201 - offset);
  return Response.json(Array.from({ length: size }, (_, i) => ({ id: String(offset + i), account_id: 'a', amount: -1, currency: 'PLN', booking_date: '2026-11-01', counterparty_name: 'Shop', remittance: null, category: 'zakupy', status: 'BOOK' })),
    { headers: { 'Content-Range': `${offset}-${offset + size - 1}/1201` } });
}
const clients: QueryClient[] = [];
function mount() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
  clients.push(client);
  return renderHook(() => useBankData('owner'), { wrapper: ({ children }: { children: ReactNode }) => createElement(QueryClientProvider, { client }, children) });
}
afterEach(() => { cleanup(); clients.forEach(c => c.clear()); source.fail = false; source.selections = []; });

it('loads complete visible-account history even when the server caps each page below the requested size', async () => {
  const { result } = mount();
  await waitFor(() => expect(result.current.isSuccess).toBe(true), { timeout: 5000 });
  expect(result.current.data?.transactions).toHaveLength(1201);
  expect(new Set(result.current.data?.transactions.map(t => t.id)).size).toBe(1201);
  expect(source.selections.every(selection => selection.split(',').includes('counterparty_iban'))).toBe(true);
});
it('rejects incomplete history instead of presenting accepted pages as complete', async () => {
  source.fail = true;
  const { result } = mount();
  await waitFor(() => expect(result.current.isError).toBe(true), { timeout: 5000 });
  expect(result.current.data).toBeUndefined();
});
