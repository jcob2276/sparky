/** TradingView scanner boundary: source percentages -> stored fractional ratios. */
import { convertCurrency, type NbpFxTable } from './gpwFundamentalsFx.ts';

export const GPW_SCAN_COLUMNS = [
  'name', 'description', 'isin', 'sector', 'currency', 'fundamental_currency_code',
  'market_cap_basic', 'price_earnings_ttm', 'price_book_ratio',
  'dividends_yield_current', 'return_on_equity', 'net_margin',
  'total_revenue_yoy_growth_ttm', 'free_cash_flow_ttm', 'net_debt_to_ebitda_fq',
  'price_earnings_forward_fy', 'total_revenue', 'net_income', 'total_revenue_fq_h',
  'close', 'earnings_per_share_forecast_next_fy',
] as const;

export interface GpwIssuer { isin: string; ticker: string; name: string }
export interface GpwScanRow { s: string; d: unknown[] }

function finite(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

export function buildGpwFundamentalsRows(
  data: GpwScanRow[], issuers: GpwIssuer[], refreshedAt: string, fx?: NbpFxTable,
) {
  const byIsin = new Map(issuers.map((c) => [c.isin, c]));
  const seen = new Set<string>();
  return data.flatMap((item) => {
    if (!item || typeof item.s !== 'string' || !item.s.startsWith('GPW:') || !Array.isArray(item.d)) return [];
    if (item.d.length !== GPW_SCAN_COLUMNS.length) throw new Error('Niepełny kontrakt danych GPW');
    const raw = Object.fromEntries(GPW_SCAN_COLUMNS.map((col, index) => [col, item.d[index]]));
    const issuer = typeof raw.isin === 'string' ? byIsin.get(raw.isin) : undefined;
    if (!issuer || seen.has(issuer.isin)) return [];
    // An ISIN can also appear under a separate listing. Only consume the registry ticker.
    if (raw.name !== issuer.ticker) return [];
    seen.add(issuer.isin);
    const quoteMcap = finite(raw.market_cap_basic);
    const mcap = convertCurrency(quoteMcap, raw.currency, 'PLN', fx);
    const fcf = convertCurrency(finite(raw.free_cash_flow_ttm), raw.fundamental_currency_code, raw.currency, fx);
    const quotePrice = finite(raw.close);
    const forecastEps = finite(raw.earnings_per_share_forecast_next_fy);
    const epsInQuoteCurrency = convertCurrency(forecastEps, raw.fundamental_currency_code, raw.currency, fx);
    const providerForwardPe = finite(raw.price_earnings_forward_fy);
    const calculatedForwardPe = quotePrice != null && quotePrice > 0 && epsInQuoteCurrency != null && epsInQuoteCurrency > 0
      ? quotePrice / epsInQuoteCurrency : null;
    const forwardPe = providerForwardPe != null && providerForwardPe > 0 ? providerForwardPe : calculatedForwardPe;
    const percent = (value: unknown) => {
      const n = finite(value);
      return n == null ? null : n / 100;
    };
    const history = Array.isArray(raw.total_revenue_fq_h) ? raw.total_revenue_fq_h.slice(0, 8) : [];
    const quarters8 = history.every((value) => finite(value) != null)
      ? history.reverse().map((value) => ({ revenue: value as number })) : [];
    return [{
      isin: issuer.isin, ticker: issuer.ticker, name: issuer.name, sector: raw.sector,
      mcap, pe: finite(raw.price_earnings_ttm), pb: finite(raw.price_book_ratio),
      div_yield: percent(raw.dividends_yield_current), dy: percent(raw.dividends_yield_current),
      roe: percent(raw.return_on_equity), net_margin: percent(raw.net_margin),
      revenue_yoy: percent(raw.total_revenue_yoy_growth_ttm),
      fcf_yield: quoteMcap != null && quoteMcap > 0 && fcf != null ? fcf / quoteMcap : null,
      net_debt_ebitda: finite(raw.net_debt_to_ebitda_fq),
      forward_pe: forwardPe,
      forward_eps: forecastEps,
      forward_pe_basis: forwardPe == null ? null : providerForwardPe != null && providerForwardPe > 0 ? 'provider_fy' : 'rolling_fy',
      quote_price: quotePrice, quote_currency: raw.currency, financial_currency: raw.fundamental_currency_code,
      fx_date: fx && (raw.currency !== 'PLN' || raw.fundamental_currency_code !== raw.currency) ? fx.date : null,
      revenue: finite(raw.total_revenue), net_profit: finite(raw.net_income),
      quarters8, refreshed_at: refreshedAt, updated_at: refreshedAt,
      source_system: 'tradingview_scanner',
      source_url: `https://www.tradingview.com/symbols/GPW-${encodeURIComponent(issuer.ticker)}/financials-overview/`,
    }];
  });
}
