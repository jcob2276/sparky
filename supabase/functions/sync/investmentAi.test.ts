import { assertThrows } from 'https://deno.land/std@0.224.0/assert/mod.ts';
import { validateInvestmentAnalysis } from './investmentAi.ts';

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
