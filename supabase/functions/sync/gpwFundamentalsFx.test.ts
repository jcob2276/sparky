import { fetchGpwFxTable, convertCurrency } from './gpwFundamentalsFx.ts';

async function readFx(input: unknown) {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = () => Promise.resolve(Response.json(input));
  try { return await fetchGpwFxTable(); } finally { globalThis.fetch = originalFetch; }
}

Deno.test('official NBP table exposes its date and PLN conversion without rounding', async () => {
  const fx = await readFx([{ table: 'A', effectiveDate: '2026-10-05',
    rates: [{ code: 'EUR', mid: 4.3855 }, { code: 'USD', mid: 3.9116 }] }]);
  if (fx.date !== '2026-10-05' || Math.abs((convertCurrency(100, 'EUR', 'PLN', fx) ?? 0) - 438.55) > 1e-9)
    throw new Error('Incorrect official conversion');
  if (convertCurrency(100, 'USD', 'EUR', fx) !== 100 * 3.9116 / 4.3855)
    throw new Error('Incorrect cross currency conversion');
  if (convertCurrency(100, 'XYZ', 'PLN', fx) !== null)
    throw new Error('Invented an unknown exchange rate');
});

Deno.test('bad NBP payloads fail instead of installing fallback exchange rates', async () => {
  for (const input of [[], {}, [{ table: 'A', effectiveDate: 'today', rates: [] }],
    [{ table: 'A', effectiveDate: '2026-02-30', rates: [{ code: 'EUR', mid: 4.4 }] }],
    [{ table: 'A', effectiveDate: '2026-10-05', rates: [{ code: 'EUR', mid: 0 }] }]]) {
    let failed = false;
    try { await readFx(input); } catch { failed = true; }
    if (!failed) throw new Error('Accepted an invalid currency source');
  }
});
