import { afterEach, describe, expect, it, vi } from 'vitest';
import { fetchGpwFundamentalsList } from './gpwFundamentalsService';
import { orcaSelect } from './superinvestorsApi';

afterEach(() => vi.unstubAllGlobals());

describe('GPW fundamentals data contract', () => {
  it('joins official annual facts by ISIN without replacing current provider ratios', async () => {
    vi.stubGlobal('fetch', vi.fn().mockImplementation((url: string) => Promise.resolve(Response.json(
      String(url).includes('gpw_latest_annual_reports') ? [{isin:'PLXTRDM00011',period_start:'2025-01-01',
        period_end:'2025-12-31',publication_date:'2026-03-20',currency:'PLN',
        source_url:'https://ir.xtb.com/report.zip',metrics:{revenue:{value:'2146056000'}}}]
        : [{isin:'PLXTRDM00011',ticker:'XTB',pe:18,refreshed_at:'2026-10-07T11:00:00Z'}],
    ))));
    const {companies}=await fetchGpwFundamentalsList();
    expect(companies[0]).toMatchObject({pe:18,annualReport:{periodEnd:'2025-12-31',revenue:2146056000}});
  });
  it('preserves source provenance and distinguishes fetch time from report time', async () => {
    vi.stubGlobal('fetch', vi.fn().mockImplementation(() => new Response(JSON.stringify([
      { ticker: 'XTB', source_system: 'tradingview_scanner',
        source_url: 'https://www.tradingview.com/symbols/GPW-XTB/financials-overview/',
        fx_date: '2026-10-05', refreshed_at: '2026-10-06T09:00:00Z' },
    ]))));
    const { companies } = await fetchGpwFundamentalsList();
    expect(companies[0]).toMatchObject({ sourceSystem: 'tradingview_scanner',
      sourceUrl: 'https://www.tradingview.com/symbols/GPW-XTB/financials-overview/', fxDate: '2026-10-05' });
  });

  it('does not present malformed refresh dates as verified freshness', async () => {
    vi.stubGlobal('fetch', vi.fn().mockImplementation(() => new Response(JSON.stringify([
      { ticker: 'XTB', refreshed_at: 'not-a-date' },
    ]))));
    expect((await fetchGpwFundamentalsList()).refreshedDate).toBeNull();
  });

  it('surfaces a schema error instead of reporting a successful empty list', async () => {
    vi.stubGlobal('fetch', vi.fn().mockImplementation(() => new Response(
      JSON.stringify({ code: '42703', message: 'column sector does not exist' }),
      { status: 400 },
    )));
    await expect(fetchGpwFundamentalsList()).rejects.toThrow();
  });

  it('keeps missing revenue history and refresh date missing', async () => {
    vi.stubGlobal('fetch', vi.fn().mockImplementation(() => new Response(JSON.stringify([
      { ticker: 'CDR', name: 'CD Projekt', pe: 21, quarters8: null, refreshed_at: null },
    ]))));
    const result = await fetchGpwFundamentalsList();
    expect(result.companies[0].quarters8).toEqual([]);
    expect(result.refreshedDate).toBeNull();
  });

  it('preserves ratio precision and maps actual FCF, leverage and forward valuation', async () => {
    vi.stubGlobal('fetch', vi.fn().mockImplementation(() => new Response(JSON.stringify([
      { ticker: 'AAA', sector: 'Finance', mcap: 1234567890, pe: 12.34,
        div_yield: 0.0401, roe: 0.1501, net_margin: 0.12, revenue_yoy: 0.1501,
        fcf_yield: 0.08, net_debt_ebitda: 4.2, forward_pe: 10.3,
        forward_eps: 1.5, forward_pe_basis: 'rolling_fy', quote_price: 15.45,
        quote_currency: 'PLN', financial_currency: 'PLN',
        refreshed_at: '2026-10-05T15:00:00Z' },
    ]))));
    const result = await fetchGpwFundamentalsList();
    expect(result.companies[0]).toMatchObject({
      mcapMld: 1.23456789, pe: 12.34, divYieldPct: 4.01,
      fcfYieldPct: 8, debtToEbitda: 4.2, forwardPe: 10.3,
      forwardEps: 1.5, forwardPeBasis: 'rolling_fy', quotePrice: 15.45,
      quoteCurrency: 'PLN', financialCurrency: 'PLN',
    });
    expect(result.companies[0].roePct).toBeCloseTo(15.01, 8);
    expect(result.companies[0].revenueYoyPct).toBeCloseTo(15.01, 8);
    expect(result.refreshedDate).toBe('2026-10-05');
  });

  it('rejects invalid numbers rather than accepting a numeric prefix', async () => {
    vi.stubGlobal('fetch', vi.fn().mockImplementation(() => new Response(JSON.stringify([
      { ticker: 'AAA', pe: '12xyz', div_yield: '', mcap: false },
    ]))));
    const { companies } = await fetchGpwFundamentalsList();
    expect(companies[0]).toMatchObject({ pe: null, divYieldPct: null, mcapMld: null });
  });
});

describe('strict investment reads', () => {
  it('rejects a missing relation for a required data source', async () => {
    vi.stubGlobal('fetch', vi.fn().mockImplementation(() => new Response('{}', { status: 404 })));
    await expect(orcaSelect('gpw_fin_public_teaser?limit=1', { strict: true })).rejects.toThrow();
  });

  it('rejects a malformed successful response', async () => {
    vi.stubGlobal('fetch', vi.fn().mockImplementation(() => new Response('{"unexpected":true}')));
    await expect(orcaSelect('gpw_fin_public_teaser?limit=1', { strict: true })).rejects.toThrow();
  });
});
