import { test } from 'node:test';
import assert from 'node:assert/strict';
import { syncKnfShortsDirect } from './sync_knf_shorts.mjs';

test('KNF CLI invokes the canonical authenticated importer once', async () => {
  const calls = [];
  const result = await syncKnfShortsDirect({
    env: { VITE_SUPABASE_URL: 'https://example.supabase.co', SB_SECRET_KEY: 'test-key' },
    fetchImpl: async (url, options) => {
      calls.push({ url: String(url), options });
      return new Response(JSON.stringify({ ok: true, current: 17 }), { status: 200 });
    },
  });
  assert.equal(calls.length, 1);
  assert.equal(calls[0].url, 'https://example.supabase.co/functions/v1/sync?service=knf_shorts');
  assert.equal(calls[0].options.headers.Authorization, 'Bearer test-key');
  assert.equal(calls[0].options.method, 'POST');
  assert.equal(result.current, 17);
});

test('failed imports reject without exposing server error bodies', async () => {
  await assert.rejects(syncKnfShortsDirect({
    env: { VITE_SUPABASE_URL: 'https://example.supabase.co', SB_SECRET_KEY: 'test-key' },
    fetchImpl: async () => new Response('sensitive diagnostic', { status: 500 }),
  }), /^Error: KNF import failed \(HTTP 500\)$/);
});

test('missing credentials do not make a request', async () => {
  await assert.rejects(syncKnfShortsDirect({ env: {}, fetchImpl: () => assert.fail('request sent') }), /configuration/);
});
