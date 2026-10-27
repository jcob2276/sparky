import { runQuotesSync } from './quotes.ts';

Deno.test('large long-history requests stop before exhausting the worker CPU budget', async () => {
  const original = globalThis.fetch;
  globalThis.fetch = () => { throw new Error('Validation should run before provider requests'); };
  try {
    let message = '';
    try {
      await runQuotesSync(new Request('https://sparky.test/sync?service=quotes', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tickers: ['AAPL.US','MSFT.US','NVDA.US','AMZN.US'], range: '2y' }),
      }));
    } catch (error) { message = String(error); }
    if (!message.includes('maksymalnie 3 instrumentów')) throw new Error('Oversized history request reached the providers');
  } finally { globalThis.fetch = original; }
});

const sourceTime = Date.parse('2026-10-05T20:00:00Z') / 1000;
const chart = { chart: { result: [{
  meta: { regularMarketPrice: 100, chartPreviousClose: 90, currency: 'USD', regularMarketTime: sourceTime },
  timestamp: [sourceTime],
  indicators: { quote: [{ open: [95], high: [101], low: [94], close: [100], volume: [123] }],
    adjclose: [{ adjclose: [99] }] },
}], error: null } };

async function exercise(options: { nbpError?: boolean; quoteError?: boolean; chart?: unknown } = {}) {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = (input) => {
    const url = String(input);
    if (url.startsWith('https://api.nbp.pl/')) return Promise.resolve(options.nbpError
      ? new Response('Unavailable', { status: 400 })
      : Response.json(url.includes('/tables/')
        ? [{ table: 'A', effectiveDate: '2026-10-06', rates: [{ code: 'USD', mid: 3.8 }, { code: 'EUR', mid: 4.2 }] }]
        : { rates: [{ effectiveDate: '2026-10-06', mid: url.includes('/usd/') ? 3.8 : 4.2 }] }));
    if (url.startsWith('https://query1.finance.yahoo.com/')) return Promise.resolve(options.quoteError
      ? new Response('Unavailable', { status: 400 }) : Response.json(options.chart ?? chart));
    throw new Error(`Unexpected quote request: ${url}`);
  };
  try {
    const result = await runQuotesSync(new Request('https://sparky.test/sync?service=quotes', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tickers: ['AMZN.US'], range: '1y' }),
    }));
    return { result: result as { ok: boolean; quotes: Record<string, { pricePln: number; quoteAsOf: string }> } };
  } finally {
    globalThis.fetch = originalFetch;
  }
}

Deno.test('quote source outage fails instead of returning successful empty quotes', async () => {
  let failed = false;
  try { await exercise({ quoteError: true }); } catch { failed = true; }
  if (!failed) throw new Error('Reported successful refresh without any quotes');
});

Deno.test('NBP outage never invents fresh exchange rates', async () => {
  let failed = false;
  try { await exercise({ nbpError: true }); } catch { failed = true; }
  if (!failed) throw new Error('Used invented FX after an NBP outage');
});

Deno.test('quotes preserve the provider timestamp and convert to PLN', async () => {
  const { result } = await exercise();
  if (result.quotes.AMZN?.pricePln !== 380 || result.quotes.AMZN?.quoteAsOf !== '2026-10-05T20:00:00.000Z')
    throw new Error('Lost provider timestamp or failed to normalize broker ticker');
});

Deno.test('missing provider timestamp cannot be replaced with fetch time', async () => {
  const missingTime = structuredClone(chart);
  delete (missingTime.chart.result[0].meta as Partial<typeof chart.chart.result[0]['meta']>).regularMarketTime;
  let failed = false;
  try { await exercise({ chart: missingTime }); } catch { failed = true; }
  if (!failed) throw new Error('A quote without a source timestamp was accepted');
});

Deno.test('unsupported currency is never treated as PLN', async () => {
  const unsupported = structuredClone(chart);
  unsupported.chart.result[0].meta.currency = 'JPY';
  let failed = false;
  try { await exercise({ chart: unsupported }); } catch { failed = true; }
  if (!failed) throw new Error('A quote with an unavailable FX rate was mispriced');
});
