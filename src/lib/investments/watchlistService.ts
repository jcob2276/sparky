import { orcaSelect } from './superinvestorsApi';
import { summarizeCompanyPrices, type CompanyPriceRow } from './companyPriceHistory';
import { usQuoteSymbol } from './marketSymbol';
import { isListingInactive, type CompanyListing, type ListingStatus } from './companyListing';
import { getTodayWarsaw, shiftDateStr } from '../date';
import { clampToYearFloor, yearFloor } from './yearFloor';
export { searchWatchlistCompanies, resolveWatchlistTicker } from './watchlistSearch';

export interface WatchlistItem extends CompanyListing {
  ticker: string; name: string; market: 'USA' | 'GPW'; price: string;
  priceDate?: string | null; priceSourceUrl?: string | null;
  changePercent: number | null; signalsCount: number | null;
  lastSignal: string; sparkline?: number[]; signalSourceUrls?: string[];
  /** Form 4 (P/S) od 1 stycznia; null = brak odczytu lub rynek bez Form 4. */
  insiderBuys?: number | null; insiderSells?: number | null;
  shortPct?: number | null; netChanges13f?: number | null;
}
export interface SearchCompanyResult {
  ticker: string; name: string; market: 'USA' | 'GPW'; sector?: string | null;
}
interface CompanyRow {
  ticker: string; name?: string; listing_status?: ListingStatus;
  listing_status_date?: string; listing_source_url?: string;
}
interface ConsensusRow {
  ticker: string; company_name?: string; net_changes?: number | null;
  reported_increases?: number; reported_decreases?: number; compared_funds?: number;
  period_of_report?: string; previous_period?: string; source_urls?: string[];
}
interface ShortRow { ticker: string; total_pct?: number; public_holders?: number | null }
interface InsiderRow { ticker: string; transaction_code: string }
interface PriceRow extends CompanyPriceRow { ticker: string }

export async function fetchWatchlistDetails(tickers: string[]): Promise<WatchlistItem[]> {
  const cleanList = [...new Set(tickers.map(t => t.trim().toUpperCase()).filter(Boolean))];
  if (!cleanList.length) return [];
  const rawTickers = [...new Set(cleanList.map(t => t.replace(/\.(WA|PL|US)$/, '')))];
  const encTickers = rawTickers.map(encodeURIComponent).join(',');
  const symbols = [...new Set(rawTickers.flatMap(t => [usQuoteSymbol(t), `${t}.WA`]))];
  const today = getTodayWarsaw();
  const [companiesRead, gpwRead, pricesRead, consensusRead, shortsRead, catalogueRead, insidersRead] = await Promise.allSettled([
    orcaSelect<CompanyRow>(`companies?market=eq.us&ticker=in.(${encTickers})&select=ticker,name,listing_status,listing_status_date,listing_source_url`, { strict: true }),
    orcaSelect<CompanyRow>(`gpw_fin_public_teaser?ticker=in.(${encTickers})&select=ticker,name`, { strict: true }),
    orcaSelect<PriceRow>(`prices_daily?ticker=in.(${symbols.map(encodeURIComponent).join(',')})&date=gte.${clampToYearFloor(shiftDateStr(today, -45), today)}&date=lte.${today}&select=ticker,date,close_raw,currency,source_url&order=ticker.asc,date.asc`, { strict: true }),
    orcaSelect<ConsensusRow>(`vw_sec13f_screener?ticker=in.(${encTickers})&select=ticker,company_name,net_changes,reported_increases,reported_decreases,compared_funds,period_of_report,previous_period,source_urls`, { strict: true }),
    orcaSelect<ShortRow>(`vw_gpw_shorts_agg?ticker=in.(${encTickers})&select=ticker,total_pct,public_holders`, { strict: true }),
    orcaSelect<CompanyRow>(`us_security_catalogue?ticker=in.(${encTickers})&select=ticker,name`, { strict: true }),
    orcaSelect<InsiderRow>(`vw_sec_form4_public?select=ticker,transaction_code&ticker=in.(${encTickers})&is_derivative=eq.false&form_type=eq.4&transaction_code=in.(P,S)&filing_date=gte.${yearFloor(today)}&filing_date=lte.${today}&limit=3000`, { strict: true }),
  ]);
  const insiders = insidersRead.status === 'fulfilled' ? insidersRead.value : null;
  const companies = new Map(companiesRead.status === 'fulfilled' ? companiesRead.value.map(c => [c.ticker.toUpperCase(), c]) : []);
  const gpw = new Map(gpwRead.status === 'fulfilled' ? gpwRead.value.map(c => [c.ticker.toUpperCase(), c]) : []);
  const consensus = new Map(consensusRead.status === 'fulfilled' ? consensusRead.value.map(c => [c.ticker.toUpperCase(), c]) : []);
  const shorts = new Map(shortsRead.status === 'fulfilled' ? shortsRead.value.map(c => [c.ticker.toUpperCase(), c]) : []);
  const prices = pricesRead.status === 'fulfilled' ? pricesRead.value : [];
  const catalogue = new Map(catalogueRead.status === 'fulfilled' ? catalogueRead.value.map(c => [c.ticker.toUpperCase(), c]) : []);
  return cleanList.map(ticker => {
    const raw = ticker.replace(/\.(WA|PL|US)$/, '');
    const market = /\.(WA|PL)$/.test(ticker) || (!ticker.endsWith('.US') && gpw.has(raw) && !consensus.has(raw)) ? 'GPW' : 'USA';
    const listing = market === 'USA' ? companies.get(raw) : undefined;
    const inactive = isListingInactive(listing?.listing_status);
    const symbol = market === 'GPW' ? `${raw}.WA` : usQuoteSymbol(raw);
    const quote = summarizeCompanyPrices(prices.filter(p => p.ticker === symbol), today);
    const validCurrency = quote.priceCurrency === (market === 'GPW' ? 'PLN' : 'USD');
    const c = market === 'USA' ? consensus.get(raw) : undefined;
    const s = market === 'GPW' ? shorts.get(raw) : undefined;
    const signalFailed = (market === 'USA' ? consensusRead : shortsRead).status === 'rejected';
    let lastSignal = signalFailed ? 'Błąd odczytu zdarzeń' : market === 'USA' ? '13F: brak porównania' : 'Brak ujawnionej pozycji KNF';
    let signalsCount: number | null = signalFailed || market === 'USA' ? null : 0;
    if (c?.compared_funds && c.net_changes != null) {
      lastSignal = `13F: bilans zmian ${c.net_changes > 0 ? '+' : ''}${c.net_changes} · ${c.previous_period} → ${c.period_of_report}`;
      signalsCount = (c.reported_increases ?? 0) + (c.reported_decreases ?? 0);
    } else if (s && (s.total_pct ?? 0) > 0) {
      lastSignal = `Szort KNF: ${s.total_pct}% · ${s.public_holders ?? '—'} podmiotów`;
      signalsCount = s.public_holders ?? null;
    }
    const own = market === 'USA' && insiders ? insiders.filter(r => r.ticker?.toUpperCase() === raw) : null;
    if (pricesRead.status === 'rejected') lastSignal += ' · Błąd odczytu kursu';
    return { ticker, market,
      name: market === 'GPW' ? gpw.get(raw)?.name || raw : c?.company_name || listing?.name || catalogue.get(raw)?.name || raw,
      price: validCurrency && !inactive && quote.price != null ? `${quote.price.toFixed(2)} ${quote.priceCurrency}` : '—',
      priceDate: validCurrency && !inactive ? quote.priceDate : null,
      priceSourceUrl: validCurrency && !inactive ? quote.priceSourceUrl : null,
      changePercent: validCurrency && !inactive ? quote.changeTodayPct : null,
      sparkline: validCurrency && !inactive ? quote.prices.slice(-20).map(p => p.close) : [],
      listingStatus: listing?.listing_status, listingStatusDate: listing?.listing_status_date,
      listingSourceUrl: listing?.listing_source_url,
      insiderBuys: own ? own.filter(r => r.transaction_code === 'P').length : null,
      insiderSells: own ? own.filter(r => r.transaction_code === 'S').length : null,
      shortPct: s?.total_pct ?? null, netChanges13f: c?.compared_funds && c.net_changes != null ? c.net_changes : null,
      signalsCount, lastSignal, signalSourceUrls: c?.source_urls ?? [],
    };
  });
}
