import { runGpwFundamentalsSync } from './gpwFundamentals.ts';
import { GPW_SCAN_COLUMNS } from './gpwFundamentalsData.ts';

async function exerciseSync(nbpUnavailable: boolean) {
  const originalFetch = globalThis.fetch;
  const envKeys = ['SUPABASE_URL', 'SB_SECRET_KEY'];
  const originalEnv = envKeys.map((key) => Deno.env.get(key));
  Deno.env.set('SUPABASE_URL', 'https://gpw-test.supabase.co');
  Deno.env.set('SB_SECRET_KEY', 'test-service-key');
  const fields: Record<string, unknown> = { name: 'AAA', isin: 'PL0000000001', currency: 'PLN',
    fundamental_currency_code: 'PLN', market_cap_basic: 2e9, close: 100,
    earnings_per_share_forecast_next_fy: 5 };
  let writtenRows: Record<string, unknown>[] = [];
  const statuses: Record<string,unknown>[]=[];
  globalThis.fetch = (input, init) => {
    const url = String(input);
    if (url.startsWith('https://scanner.tradingview.com/poland/scan'))
      return Promise.resolve(Response.json({ totalCount: 1, data: [{ s: 'GPW:AAA', d: GPW_SCAN_COLUMNS.map((c) => fields[c] ?? null) }] }));
    if (url.startsWith('https://api.nbp.pl/'))
      return Promise.resolve(nbpUnavailable ? new Response('Unavailable', { status: 503 })
        : Response.json([{ table: 'A', effectiveDate: '2026-10-05', rates: [{ code: 'EUR', mid: 4.4 }] }]));
    if (url.includes('/rest/v1/gpw_companies'))
      return Promise.resolve(Response.json([{ isin: 'PL0000000001', ticker: 'AAA', name: 'Alpha' },
        {isin:'PL0000000002',ticker:'AAA',name:'Alpha rights'},
        {isin:'PL0000000003',ticker:'BBB',name:'Beta'},
        {isin:'PL0000000004',ticker:null,name:'Historical'}]));
    if(url.includes('/rest/v1/investment_source_status')) {
      statuses.push(JSON.parse(String(init?.body)));
      return Promise.resolve(new Response(null,{status:201}));
    }
    if (url.includes('/rest/v1/gpw_fin_public_teaser')) {
      writtenRows = JSON.parse(String(init?.body));
      return Promise.resolve(new Response(null, { status: 201 }));
    }
    throw new Error(`Unexpected test request: ${url}`);
  };
  try {
    let failed = false;
    try { await runGpwFundamentalsSync(); } catch (error) {
      if (!nbpUnavailable) throw error;
      failed = true;
    }
    return { failed, writtenRows,statuses };
  } finally {
    globalThis.fetch = originalFetch;
    envKeys.forEach((key, index) => {
      if (originalEnv[index] == null) Deno.env.delete(key);
      else Deno.env.set(key, originalEnv[index]!);
    });
  }
}

Deno.test('both live API contracts produce a database write containing a real forecast valuation', async () => {
  const { writtenRows,statuses } = await exerciseSync(false);
  if (writtenRows.length !== 1 || writtenRows[0].forward_pe !== 20 || writtenRows[0].forward_eps !== 5)
    throw new Error('API forecast never reached the database write');
  const status=statuses.at(-1);
  const details=JSON.parse(String(status?.error));
  if(status?.status!=='partial' || details.registeredTickers!==2 || details.matchedTickers!==1
    || JSON.stringify(details.missingTickers)!=='["BBB"]' || details.unmappedRecords!==1)
    throw Error('Coverage counted duplicate securities or silently omitted missing companies');
});

Deno.test('an NBP outage preserves the last successful database cache', async () => {
  const { failed, writtenRows,statuses } = await exerciseSync(true);
  if (!failed || writtenRows.length) throw new Error('Overwrote cached data despite an incomplete source refresh');
  if(statuses.at(-1)?.status!=='error' || statuses.at(-1)?.last_success_at)
    throw Error('Outage was not reported or looked like a successful refresh');
});
