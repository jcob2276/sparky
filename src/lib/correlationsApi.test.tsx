import type { PropsWithChildren } from 'react';
import { cleanup, renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useCorrelationsQuery } from './correlationsApi';

const edge = vi.hoisted(() => ({ invoke: vi.fn() }));
vi.mock('./supabase', () => ({ supabase: { functions: { invoke: edge.invoke } } }));
const clients: QueryClient[] = [];
afterEach(() => { cleanup(); clients.splice(0).forEach(client => client.clear()); vi.clearAllMocks(); });

describe('correlation source failures', () => {
  it.each(['correlations', 'behaviors'])('preserves available results when %s fails', async failed => {
    const correlation = { factor: 'sleep_hours', outcome: 'hrv', r: 0.5, n: 20 };
    const behavior = { behavior: 'coffee', outcome: 'sleep', n: 20 };
    edge.invoke.mockImplementation(async (name: string) => {
      const kind = name.startsWith('vanguard-nightly') ? 'correlations' : 'behaviors';
      return kind === failed
        ? { data: null, error: { message: 'source offline' } }
        : { data: { results: [kind === 'correlations' ? correlation : behavior] }, error: null };
    });
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    clients.push(client);
    const { result } = renderHook(() => useCorrelationsQuery('owner', false), {
      wrapper: ({ children }: PropsWithChildren) => <QueryClientProvider client={client}>{children}</QueryClientProvider>,
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.sourceErrors).toEqual([{
      source: failed === 'correlations' ? 'Korelacje' : 'Wpływ zachowań', message: 'source offline',
    }]);
    expect(result.current.data?.[failed === 'correlations' ? 'behaviors' : 'correlations']).toEqual([failed === 'correlations' ? behavior : correlation]);
  });
});
