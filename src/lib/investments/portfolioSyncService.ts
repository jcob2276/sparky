import { invokeEdge } from '../supabase';
import { loadJakubPortfolio, saveJakubPortfolio, type JakubPortfolioData } from './jakubPortfolioStorage';
import { loadKondzioPortfolio, saveKondzioPortfolio, type KondzioPortfolioData } from './kondzioPortfolioStorage';

export interface PortfolioQuote {
  ticker?: string; symbol?: string; price: number; pricePln: number | null;
  currency: string; quoteAsOf?: string | null; source?: string; sourceUrl?: string;
}
export interface SyncPortfolioResult<T = JakubPortfolioData> {
  portfolio: T;
  rates: { usdPln: number; eurPln: number; date: string } | null;
  syncedCount: number;
  failedTickers: string[];
  timestamp: string;
}

/** Local edit/seed timestamps do not establish market freshness. */
export function portfolioValuationAsOf(portfolio: JakubPortfolioData | KondzioPortfolioData): string | null {
  const times = portfolio.positions.map((position) => position.quoteAsOf);
  if (!times.length || times.some((time) => !time || !Number.isFinite(Date.parse(time)))) return null;
  return (times as string[]).sort((a, b) => Date.parse(a) - Date.parse(b))[0];
}

/** Broker suffixes describe exchanges, never infer them from prices. */
export function portfolioQuoteTicker(position: { ticker: string; market: string }): string {
  const ticker = position.ticker.trim().toUpperCase();
  if (/\.(US|PL|UK)$/.test(ticker)) return ticker.replace(/\.US$/, '').replace(/\.PL$/, '.WA').replace(/\.UK$/, '.L');
  if (ticker.includes('.')) return ticker;
  if (position.market === 'GPW') return `${ticker}.WA`;
  if (position.market === 'US') return ticker;
  return ({ SXR8: 'SXR8.DE', JEDI: 'JEDI.DE', ISAC: 'ISAC.L', CSPX: 'CSPX.L' } as Record<string, string>)[ticker] ?? ticker;
}

export function updatePositionsWithQuotes<T extends JakubPortfolioData | KondzioPortfolioData>(
  current: T, quotes: Record<string, PortfolioQuote>,
): { updated: T; syncedCount: number; failedTickers: string[] } {
  let syncedCount = 0;
  const quoteTimes: string[] = [];
  const failedTickers: string[] = [];
  const positions = current.positions.map((pos) => {
    const ticker = portfolioQuoteTicker(pos);
    const q = quotes[ticker] ?? quotes[pos.ticker] ?? Object.values(quotes).find((item) =>
      item.symbol === ticker || item.ticker === ticker || item.ticker === pos.ticker);
    const time = q?.quoteAsOf;
    if (!q || q.pricePln == null || !Number.isFinite(q.pricePln) || q.pricePln <= 0 ||
      !Number.isFinite(q.price) || q.price <= 0 || !q.currency || !q.source || !time || !Number.isFinite(Date.parse(time))) {
      failedTickers.push(pos.ticker);
      return pos;
    }
    if (pos.quoteAsOf && Date.parse(time) < Date.parse(pos.quoteAsOf)) {
      failedTickers.push(pos.ticker);
      return pos;
    }
    syncedCount++;
    quoteTimes.push(time);
    const currentPrice = q.pricePln; // Server already normalized FX and units.
    const currentValue = Math.round(pos.shares * currentPrice * 100) / 100;
    const totalCost = pos.shares * pos.avgBuyPrice;
    return { ...pos, currentPrice, currentValue,
      pnlPln: Math.round((currentValue - totalCost) * 100) / 100,
      pnlPct: totalCost > 0 ? Math.round(((currentPrice - pos.avgBuyPrice) / pos.avgBuyPrice) * 10000) / 100 : 0,
      quoteAsOf: time, quoteSource: q.source, quoteSourceUrl: q.sourceUrl, quoteCurrency: q.currency };
  });
  if (!syncedCount) return { updated: current, syncedCount, failedTickers };
  const marketValuePln = Math.round(positions.reduce((sum, p) => sum + p.currentValue, 0) * 100) / 100;
  const totalCost = positions.reduce((sum, p) => sum + p.shares * p.avgBuyPrice, 0);
  const totalPnlPln = Math.round((marketValuePln - totalCost) * 100) / 100;
  return { updated: { ...current, positions, marketValuePln,
    totalValuePln: Math.round((marketValuePln + current.freeCashPln) * 100) / 100,
    totalPnlPln, totalPnlPct: totalCost > 0 ? Math.round(totalPnlPln / totalCost * 10000) / 100 : 0,
    lastUpdated: failedTickers.length ? current.lastUpdated : quoteTimes.sort((a, b) => Date.parse(a) - Date.parse(b))[0],
  }, syncedCount, failedTickers };
}

async function sync<T extends JakubPortfolioData | KondzioPortfolioData>(load: () => T, save: (data: T) => void): Promise<SyncPortfolioResult<T>> {
  const current = load();
  const tickers = current.positions.map(portfolioQuoteTicker);
  const res = await invokeEdge('sync', { query: { service: 'quotes' }, body: { tickers, range: '1mo' } }) as unknown as {
    ok: boolean; quotes?: Record<string, PortfolioQuote>; error?: string;
    rates?: SyncPortfolioResult['rates']; timestamp?: string;
  };
  if (!res?.quotes) throw new Error(res?.error || 'Brak notowań. Zachowano poprzednią wycenę.');
  const { updated, syncedCount, failedTickers } = updatePositionsWithQuotes(load(), res.quotes);
  if (!syncedCount) throw new Error('Żadna pozycja nie ma poprawnej wyceny z datą i kursem PLN. Zachowano poprzednią wycenę.');
  save(updated);
  return { portfolio: updated, rates: res.rates ?? null, syncedCount, failedTickers,
    timestamp: res.timestamp ?? new Date().toISOString() };
}
export const syncPortfolioMarketPrices = () => sync(loadJakubPortfolio, saveJakubPortfolio);
export const syncKondzioMarketPrices = () => sync(loadKondzioPortfolio, saveKondzioPortfolio);
