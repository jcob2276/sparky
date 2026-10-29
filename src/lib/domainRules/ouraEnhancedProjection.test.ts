import { afterEach, beforeEach, expect, it, vi } from 'vitest';
// Keep Deno-only dependency types out of the browser TypeScript program.
const edgeModule = '../../../supabase/functions/sync/' + 'enhanced.ts';
const { runEnhanced } = await import(edgeModule);

const state = vi.hoisted(() => ({ steps: 0 as number | null, projected: 8000 as number | null, concurrent: false, error: null as Error | null, saved: [] as Record<string, unknown>[] }));
vi.mock('../../../supabase/functions/_shared/supabase.ts', () => ({
  resolveUserScope: async () => ({ userId: 'owner' }),
  createServiceClient: () => ({
    rpc: async () => {
      if (state.error) return { error: state.error };
      state.projected = state.steps;
      return { error: null };
    },
    from: (table: string) => {
      const result = table === 'user_settings'
        ? { data: [{ user_id: 'owner', oura_token: 'fixture' }], error: null }
        : table === 'oura_daily_summary'
          ? { data: [{ date: '2026-10-29', steps: state.steps }], error: state.error }
          : { data: [{ date: '2026-10-29', steps: 8000, readiness_score: 80 }], error: null };
      const chain = {
        select: () => chain, not: () => chain, eq: () => chain, in: () => chain,
        then: (resolve: (r: typeof result) => unknown) => Promise.resolve(result).then(resolve),
        upsert: async (rows: Record<string, unknown>[]) => {
          if (state.concurrent) { state.steps = 200; state.projected = 200; }
          state.saved = rows;
          if ('steps' in rows[0]) state.projected = rows[0].steps as number | null;
          return { error: null };
        },
      };
      return chain;
    },
  }),
}));

beforeEach(() => {
  state.steps = 0; state.error = null; state.saved = []; state.concurrent = false; state.projected = 8000;
  vi.stubGlobal('fetch', vi.fn(async (url: string) => Response.json({
    data: url.includes('/daily_activity?') ? [{ day: '2026-10-29', steps: 9999, score: 75 }] : [],
  })));
});
afterEach(() => vi.unstubAllGlobals());
const request = () => new Request('https://example.invalid/sync', { method: 'POST', body: JSON.stringify({ userId: 'owner' }) });

it('projects canonical zero instead of writing an independently fetched activity value', async () => {
  await runEnhanced(request());
  expect(state.projected).toBe(0);
});
it('keeps unknown canonical steps unknown, even when an old copy exists', async () => {
  state.steps = null;
  await runEnhanced(request());
  expect(state.projected).toBeNull();
});
it('does not overwrite the projection if reading its source fails', async () => {
  state.error = new Error('canonical unavailable');
  await expect(runEnhanced(request())).rejects.toThrow('canonical unavailable');
  expect(state.projected).toBe(8000);
});
it('cannot overwrite a newer summary update between fetching and saving details', async () => {
  state.steps = 100; state.concurrent = true;
  await runEnhanced(request());
  expect(state.projected).toBe(200);
});
