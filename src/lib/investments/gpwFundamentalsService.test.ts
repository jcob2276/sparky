import { afterEach, describe, expect, it, vi } from 'vitest';
import { fetchGpwFundamentalsList } from './gpwFundamentalsService';
import { orcaSelect } from './superinvestorsApi';

afterEach(() => vi.unstubAllGlobals());

describe('GPW fundamentals data contract', () => {
  it('surfaces a schema error instead of reporting a successful empty list', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(
      JSON.stringify({ code: '42703', message: 'column sector does not exist' }),
      { status: 400 },
    )));
    await expect(fetchGpwFundamentalsList()).rejects.toThrow();
  });

  it('keeps missing revenue history and refresh date missing', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify([
      { ticker: 'CDR', name: 'CD Projekt', pe: 21, quarters8: null, refreshed_at: null },
    ]))));
    const result = await fetchGpwFundamentalsList();
    expect(result.companies[0].quarters8).toEqual([]);
    expect(result.refreshedDate).toBeNull();
  });

  it('preserves ratio precision and maps actual FCF, leverage and forward valuation', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify([
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
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify([
      { ticker: 'AAA', pe: '12xyz', div_yield: '', mcap: false },
    ]))));
    const { companies } = await fetchGpwFundamentalsList();
    expect(companies[0]).toMatchObject({ pe: null, divYieldPct: null, mcapMld: null });
  });
});

describe('strict investment reads', () => {
  it('rejects a missing relation for a required data source', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('{}', { status: 404 })));
    await expect(orcaSelect('gpw_fin_public_teaser?limit=1', { strict: true })).rejects.toThrow();
  });

  it('rejects a malformed successful response', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('{"unexpected":true}')));
    await expect(orcaSelect('gpw_fin_public_teaser?limit=1', { strict: true })).rejects.toThrow();
  });
});
