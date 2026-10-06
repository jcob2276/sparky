import { runKnfShortsSync } from './knfShorts.ts';

const record = { HOLDER_FULL_NAME: 'QUBE RESEARCH &amp; TECHNOLOGIES LIMITED',
  ISSUER_NAME: 'KRUK', ISIN: 'PLKRK0000010', POSITION_DATE: '2026-10-01',
  MODIFY_DATE: '2026-10-02', NET_SHORT_POSITION_O: '0.53' };

async function exercise(options: { authorized?: boolean; invalid?: boolean; incomplete?: boolean; dbError?: boolean } = {}) {
  const previousFetch = globalThis.fetch;
  const keys = ['SUPABASE_URL', 'SB_SECRET_KEY'];
  const values = keys.map((key) => Deno.env.get(key));
  Deno.env.set('SUPABASE_URL', 'https://knf-test.supabase.co');
  Deno.env.set('SB_SECRET_KEY', 'test-service-key');
  const writes: { path: string; body: Record<string, unknown> }[] = [];
  globalThis.fetch = async (input, init) => {
    const url = String(input);
    if (url === 'https://rss.knf.gov.pl/rss_pub/JSON') {
      const request = JSON.parse(new URLSearchParams(String(init?.body)).get('request')!);
      return Response.json({ status: 'success', total: options.incomplete ? 2 : 1,
        records: request.offset ? [] : [{ ...record, NET_SHORT_POSITION_O: options.invalid ? 'unknown' : '0.53' }] });
    }
    if (url.includes('/rest/v1/')) {
      if (!init?.body) return Response.json([{ isin: 'PLKRK0000010', ticker: 'KRU' }]);
      writes.push({ path: new URL(url).pathname, body: JSON.parse(String(init.body)) });
      return options.dbError ? Response.json({ message: 'write failed' }, { status: 400 }) : Response.json({ current: 1 });
    }
    throw new Error(`Unexpected request ${url}`);
  };
  try {
    const result = await runKnfShortsSync(new Request('https://sparky.test/sync?service=knf_shorts', {
      method: 'POST', headers: options.authorized ? { Authorization: 'Bearer test-service-key' } : {}, body: '{}' }));
    return { result, writes };
  } finally {
    globalThis.fetch = previousFetch;
    keys.forEach((key, i) => values[i] == null ? Deno.env.delete(key) : Deno.env.set(key, values[i]!));
  }
}

Deno.test('KNF public requests cannot overwrite the shared snapshot', async () => {
  const { result, writes } = await exercise();
  if (!(result instanceof Response) || result.status !== 401 || writes.length)
    throw new Error('Unprivileged caller modified KNF data');
});

Deno.test('KNF repeated imports retain event identity and replace current state atomically', async () => {
  const first = await exercise({ authorized: true });
  await new Promise((resolve) => setTimeout(resolve, 2));
  const second = await exercise({ authorized: true });
  const a = first.writes.find((write) => write.path.endsWith('/rpc/replace_knf_snapshot'));
  const b = second.writes.find((write) => write.path.endsWith('/rpc/replace_knf_snapshot'));
  const current = a?.body.p_current as Record<string, unknown>[] | undefined;
  const history = a?.body.p_history as Record<string, unknown>[] | undefined;
  const next = b?.body.p_current as Record<string, unknown>[] | undefined;
  if (!current?.[0]?.external_id || current[0].external_id !== next?.[0]?.external_id)
    throw new Error('Repeated import creates duplicate event identities');
  if (current[0].holder !== 'QUBE RESEARCH & TECHNOLOGIES LIMITED' || current[0].ticker !== 'KRU' || !history?.length)
    throw new Error('Official holder, ISIN mapping or separate history lost');
});

for (const [name, options] of [
  ['malformed percentages', { invalid: true }], ['incomplete official pagination', { incomplete: true }],
  ['failed database transaction', { dbError: true }],
] as const) Deno.test(`KNF rejects ${name} without reporting successful refresh`, async () => {
  let failed = false;
  try { await exercise({ ...options, authorized: true }); } catch { failed = true; }
  if (!failed) throw new Error(`Accepted ${name}`);
});
