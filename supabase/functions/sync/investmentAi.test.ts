import { assertEquals, assertThrows } from 'https://deno.land/std@0.224.0/assert/mod.ts';
import { readInvestmentEvidence, validateInvestmentAnalysis } from './investmentAi.ts';

Deno.test('analyst receives sourced USA and GPW financial periods and preserves source failures', async () => {
  const reads: Array<{ dataset: string; select?: string; tickers?: string[] }> = [];
  const fixture = { ticker: 'AMD', period_start: '2025-12-28', period_end: '2026-06-27',
    publication_date: '2026-08-05', currency: 'USD', form_type: '10-Q',
    metrics: { net_profit: { value: '3680000000', concept: 'us-gaap:NetIncomeLoss' } },
    source_url: 'https://www.sec.gov/Archives/edgar/data/2488/000000248826000123/amd-20260627.htm' };
  const db = { from(dataset: string) {
    const read: typeof reads[number] = { dataset };
    reads.push(read);
    const builder = {
      select(select: string) { read.select = select; return builder; },
      not() { return builder; }, order() { return builder; }, limit() { return builder; },
      in(_key: string, tickers: string[]) { read.tickers = tickers; return builder; },
      then(resolve: (result: unknown) => void) { resolve(dataset === 'gpw_company_annual_reports'
        ? { data: null, error: { message: 'API unavailable' } }
        : { data: dataset === 'us_company_financial_reports' ? [fixture] : [], error: null }); },
    };
    return builder;
  } };
  const evidence = await readInvestmentEvidence(db as unknown as Parameters<typeof readInvestmentEvidence>[0], ['AMD']);
  assertEquals(evidence.find(row => row.dataset === 'us_company_financial_reports')?.rows, [fixture]);
  assertEquals(reads.find(row => row.dataset === 'us_company_financial_reports')?.tickers, ['AMD']);
  assertEquals(reads.find(row => row.dataset === 'us_company_financial_reports')?.select?.includes('period_start,period_end'), true);
  assertEquals(evidence.find(row => row.dataset === 'gpw_company_annual_reports')?.rows, []);
  assertEquals(!!evidence.find(row => row.dataset === 'gpw_company_annual_reports')?.unavailable, true);
  validateInvestmentAnalysis(`Wynik za okres [raport](${fixture.source_url})`, 'stop', evidence);
});

Deno.test('investment analysis rejects truncated, empty, absent and invented citations', () => {
  const evidence = [{ dataset: 'quotes', rows: [{ sourceUrl: 'https://finance.yahoo.com/quote/AMD' }] },
    { dataset: '13f', rows: [{ source_urls: ['https://www.sec.gov/Archives/example'] }] }];
  assertThrows(() => validateInvestmentAnalysis('Fact [source](https://finance.yahoo.com/quote/AMD)', 'length', evidence));
  assertThrows(() => validateInvestmentAnalysis(' ', 'stop', evidence));
  assertThrows(() => validateInvestmentAnalysis('Fact (Yahoo)', 'stop', evidence));
  assertThrows(() => validateInvestmentAnalysis('Fact [source](https://invented.example/AMD)', 'stop', evidence));
  validateInvestmentAnalysis('Fact [source](https://finance.yahoo.com/quote/AMD)', 'stop', evidence);
  validateInvestmentAnalysis('Fact [source](https://www.sec.gov/Archives/example)', 'stop', evidence);
  validateInvestmentAnalysis('Brak zweryfikowanych danych.', 'stop', []);
});
