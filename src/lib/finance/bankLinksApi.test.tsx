import { createElement, type ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook } from '@testing-library/react';
import { expect, it, vi } from 'vitest';
import { useFinanceBankLink } from './bankLinksApi';

const recorded = vi.hoisted(() => ({ patch: null as Record<string, unknown> | null }));
vi.mock('../supabase', async () => {
  const { createClient } = await import('@supabase/supabase-js');
  return { supabase: createClient('https://example.supabase.co', 'public-test-key', {
    auth: { persistSession: false, autoRefreshToken: false }, global: { fetch: async (input, init) => {
      const req = new Request(input, init);
      const url = new URL(req.url);
      expect(url.hostname).toBe('example.supabase.co');
      expect(url.searchParams.get('user_id')).toBe('eq.owner');
      expect(url.searchParams.get('id')).toBe('eq.savings');
      if (req.method === 'GET') return Response.json({ account_type: 'savings' });
      expect(req.method).toBe('PATCH');
      recorded.patch = JSON.parse(await req.text());
      return Response.json({ id: 'savings' });
    } },
  }) };
});

it.each([false, true])('preserves the savings type when changing its bank link (unlink: %s)', async unlink => {
  const client = new QueryClient();
  const wrapper = ({ children }: { children: ReactNode }) => createElement(QueryClientProvider, { client }, children);
  const { result } = renderHook(() => useFinanceBankLink('owner'), { wrapper });
  await act(async () => { await result.current.mutateAsync({ financeAccountId: 'savings', unlink,
    bank: { id: 'bank', iban: 'PL1234', name: 'Example', currency: 'PLN', balance: 19500, balance_synced_at: null } }); });
  expect(recorded.patch).toMatchObject({ account_type: 'savings', bank_account_id: unlink ? null : 'bank', balance: 19500 });
});
