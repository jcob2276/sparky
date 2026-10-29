import { afterEach, expect, it, vi } from 'vitest';

const state = vi.hoisted(() => ({ rows: [] as Array<{ date: string }> }));
vi.mock('../../../supabase/functions/_shared/supabase.ts', () => ({
  resolveUserScope: async () => ({ userId: 'owner' }),
  safeExecute: async (query: PromiseLike<{ data: unknown }>) => (await query).data,
  createServiceClient: () => ({
    from: (table: string) => {
      const result = { data: table === 'user_settings' ? { oura_token: 'fixture' } : [], error: null };
      const chain = {
        select: () => chain, eq: () => chain, single: () => chain, in: () => chain,
        then: (resolve: (r: typeof result) => unknown) => Promise.resolve(result).then(resolve),
        upsert: async (rows: Array<{ date: string }>) => { state.rows = rows; return { data: null }; },
      };
      return chain;
    },
  }),
}));
vi.mock('../../../supabase/functions/sync/enhanced.ts', () => ({ runEnhanced: async () => ({}) }));
vi.mock('../../../supabase/functions/sync/timeseries.ts', () => ({ runTimeseries: async () => ({}) }));
vi.mock('../../../supabase/functions/_shared/telegram.ts', () => ({ sendMessage: vi.fn() }));
afterEach(() => vi.unstubAllGlobals());

it('writes descending API days in the same order as the source-row projector locks', async () => {
  vi.stubGlobal('fetch', vi.fn(async (url: string) => Response.json({
    data: url.includes('/daily_activity?') ? [
      { day: '2026-10-28', steps: 200 }, { day: '2026-10-27', steps: 100 },
    ] : [],
  })));
  const edgeModule = '../../../supabase/functions/sync/' + 'oura.ts';
  const { runOuraSync } = await import(edgeModule);
  await runOuraSync(new Request('https://example.invalid/sync', { method: 'POST', body: JSON.stringify({
    userId: 'owner', start_date: '2026-10-27', end_date: '2026-10-29',
  }) }));
  expect(state.rows.map(row => row.date)).toEqual(['2026-10-27', '2026-10-28']);
});
