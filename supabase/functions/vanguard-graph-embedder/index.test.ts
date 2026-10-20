import { deepStrictEqual as eq, ok } from 'node:assert';

let handler: (req: Request) => Promise<Response>;
const descriptor = Object.getOwnPropertyDescriptor(Deno, 'serve')!;
Object.defineProperty(Deno, 'serve', { configurable: true, writable: true, value: (fn: typeof handler) => { handler = fn; } });
try { await import('./index.ts'); } finally { Object.defineProperty(Deno, 'serve', descriptor); }

async function backfill(mode: 'partial' | 'success' | 'missing-vector' | 'empty-update' | 'count-failure' | 'invalid-vector' | 'provider-failure') {
  const settings = { SUPABASE_URL: 'https://example.supabase.co', SUPABASE_SERVICE_ROLE_KEY: 'fixture',
    SB_SECRET_KEY: '', GEMINI_API_KEY: 'gemini-fixture' };
  const prior = new Map(Object.keys(settings).map(key => [key, Deno.env.get(key)]));
  for (const [key, value] of Object.entries(settings)) Deno.env.set(key, value);
  const original = globalThis.fetch;
  const updates: string[] = [];
  globalThis.fetch = async (input, init) => {
    const req = input instanceof Request ? input : new Request(input, init);
    const url = new URL(req.url);
    if (url.hostname === 'generativelanguage.googleapis.com') return mode === 'provider-failure'
      ? Response.json({ error: 'invalid API key' }, { status: 401 })
      : Response.json({ embeddings: (mode === 'missing-vector' ? [0] : [0, 1])
        .map(() => ({ values: Array(mode === 'invalid-vector' ? 12 : 1536).fill(0.1) })) });
    if (req.method === 'HEAD') return mode === 'count-failure'
      ? Response.json({ message: 'count unavailable' }, { status: 400 })
      : new Response(null, { headers: { 'content-range': mode === 'success' ? '*/0' : '*/1' } });
    if (req.method === 'GET') return Response.json(['link-1', 'link-2'].map(id => ({ id, source_entity: 'Jakub', relation: 'uczy_sie', target_entity: 'PJM' })));
    if (req.method === 'PATCH') {
      const id = url.searchParams.get('id')!.slice(3);
      if (id === 'link-2' && mode === 'partial') return Response.json({ message: 'write unavailable' }, { status: 400 });
      if (id === 'link-2' && mode === 'empty-update') return Response.json([]);
      updates.push(id);
      return Response.json([{ id }]);
    }
    return Response.json(null);
  };
  try {
    const response = await handler(new Request('https://example.supabase.co/functions/v1/vanguard-graph-embedder', {
      method: 'POST', headers: { Authorization: 'Bearer fixture', 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: 'owner', batch_size: 2 }),
    }));
    return { response, body: await response.json(), updates };
  } finally {
    globalThis.fetch = original;
    for (const [key, value] of prior) value === undefined ? Deno.env.delete(key) : Deno.env.set(key, value);
  }
}

for (const mode of ['partial', 'empty-update', 'missing-vector'] as const) {
  Deno.test(`embedder reports only confirmed updates and retryable links for ${mode}`, async () => {
    const { response, body } = await backfill(mode);
    eq(response.status, 503);
    eq(body.success, false);
    eq(body.updated, 1);
    eq(body.failed, 1);
    eq(body.retryable_link_ids, ['link-2']);
    ok(body.errors.length > 0);
  });
}

Deno.test('embedder only marks backfill complete after confirmed writes and a remaining count', async () => {
  const { response, body } = await backfill('success');
  eq(response.status, 200);
  eq(body.success, true);
  eq(body.updated, 2);
  eq(body.remaining, 0);
});

Deno.test('embedder preserves confirmed receipts when the remaining-count query fails', async () => {
  const { response, body } = await backfill('count-failure');
  eq(response.status, 503);
  eq(body.success, false);
  eq(body.updated, 2);
  eq(body.remaining, null);
  ok(body.errors.length > 0);
});

for (const mode of ['invalid-vector', 'provider-failure'] as const) {
  Deno.test(`embedder leaves every link retryable after ${mode}`, async () => {
    const { response, body, updates } = await backfill(mode);
    eq(response.status, 503);
    eq(body.updated, 0);
    eq(body.failed, 2);
    eq(body.retryable_link_ids, ['link-1', 'link-2']);
    eq(updates, []);
  });
}
