import { buildGpwFundamentalsRows, GPW_SCAN_COLUMNS } from './gpwFundamentalsData.ts';

const registered = [{ isin: 'PLTEST000001', ticker: 'AAA', name: 'Alpha' }];
function scanRow(overrides: Record<string, unknown> = {}) {
  const fields: Record<string, unknown> = {
    name: 'AAA', isin: 'PLTEST000001', sector: 'Finance', market_cap_basic: 2e9,
    currency: 'PLN', fundamental_currency_code: 'PLN', price_earnings_ttm: 20,
    dividends_yield_current: 5, return_on_equity: 15, net_margin: 12,
    total_revenue_yoy_growth_ttm: 8, free_cash_flow_ttm: 1e8,
    net_debt_to_ebitda_fq: 3.5, price_earnings_forward_fy: 16,
    total_revenue: 1e9, net_income: 1.2e8,
    total_revenue_fq_h: [800, 700, 600, 500, 400, 300, 200, 100, 50], ...overrides,
  };
  return { s: 'GPW:AAA', d: GPW_SCAN_COLUMNS.map((c) => fields[c] ?? null) };
}

Deno.test('provider percentages become ratios and real quarters run oldest to newest', () => {
  const rows = buildGpwFundamentalsRows([scanRow()], registered, '2026-10-05T15:00:00Z');
  const row = rows[0];
  if (row.div_yield !== 0.05 || row.roe !== 0.15 || row.revenue_yoy !== 0.08 || row.fcf_yield !== 0.05)
    throw new Error('Incorrect percentage units');
  if (row.net_debt_ebitda !== 3.5 || row.forward_pe !== 16) throw new Error('Wrong valuation metrics');
  if (JSON.stringify(row.quarters8.map((q) => q.revenue)) !== '[100,200,300,400,500,600,700,800]')
    throw new Error('Wrong quarterly chronology');
});

Deno.test('unregistered GlobalConnect symbols never enter the GPW issuer cache', () => {
  const rows = buildGpwFundamentalsRows([scanRow({ isin: 'US0000000001' })], registered, '2026-10-05');
  if (rows.length) throw new Error('Included a foreign listing outside the issuer registry');
});

Deno.test('different currencies cannot produce an FCF yield or PLN market cap', () => {
  const row = buildGpwFundamentalsRows([scanRow({ currency: 'EUR', fundamental_currency_code: 'USD' })], registered, '2026-10-05')[0];
  if (row.mcap !== null || row.fcf_yield !== null) throw new Error('Combined incompatible currencies');
});

Deno.test('missing quarterly periods are not compressed into a fabricated trend', () => {
  const row = buildGpwFundamentalsRows([scanRow({ total_revenue_fq_h: [800, null, 600] })], registered, '2026-10-05')[0];
  if (row.quarters8.length) throw new Error('Dropped missing periods and connected unrelated quarters');
});
