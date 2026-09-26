/**
 * portfolioSyncService.ts — Synchronizacja wycen portfela (Portfel Jakuba & Kondzia) z rynkiem.
 * Pobiera bieżące notowania z giełd (GPW, Nasdaq, Xetra) oraz oficjalne kursy walut z NBP.
 */

import { invokeEdge } from '../supabase';
import { getTodayWarsaw } from '../date';
import type { SyncQuotesResponse } from '../edgeTypes';
import {
  loadJakubPortfolio,
  saveJakubPortfolio,
  type JakubPortfolioData,
} from './jakubPortfolioStorage';
import {
  loadKondzioPortfolio,
  saveKondzioPortfolio,
  type KondzioPortfolioData,
} from './kondzioPortfolioStorage';

export interface SyncPortfolioResult<T = JakubPortfolioData> {
  portfolio: T;
  rates: { usdPln: number; eurPln: number; date: string };
  syncedCount: number;
  timestamp: string;
}

function updatePositionsWithQuotes<T extends JakubPortfolioData | KondzioPortfolioData>(
  current: T,
  quotes: NonNullable<SyncQuotesResponse['quotes']>
): { updated: T; syncedCount: number } {
  let syncedCount = 0;

  const updatedPositions = current.positions.map((pos) => {
    const q =
      quotes[pos.ticker] ||
      quotes[`${pos.ticker}.WA`] ||
      quotes[`${pos.ticker}.DE`];

    if (!q || q.pricePln == null) return pos;

    syncedCount++;
    const currentPrice = q.pricePln;
    const currentValue = Math.round(pos.shares * currentPrice * 100) / 100;
    const totalCost = pos.shares * pos.avgBuyPrice;
    const pnlPln = Math.round((currentValue - totalCost) * 100) / 100;
    const pnlPct =
      totalCost > 0
        ? Math.round(((currentPrice - pos.avgBuyPrice) / pos.avgBuyPrice) * 10000) / 100
        : 0;

    return {
      ...pos,
      currentPrice,
      currentValue,
      pnlPln,
      pnlPct,
    };
  });

  const marketValuePln =
    Math.round(updatedPositions.reduce((acc, p) => acc + p.currentValue, 0) * 100) / 100;
  const totalValuePln = Math.round((marketValuePln + current.freeCashPln) * 100) / 100;
  const totalCost = updatedPositions.reduce((acc, p) => acc + p.shares * p.avgBuyPrice, 0);
  const totalPnlPln = Math.round((marketValuePln - totalCost) * 100) / 100;
  const totalPnlPct =
    totalCost > 0 ? Math.round((totalPnlPln / totalCost) * 10000) / 100 : 0;

  const updated = {
    ...current,
    marketValuePln,
    totalValuePln,
    totalPnlPln,
    totalPnlPct,
    lastUpdated: new Date().toISOString(),
    positions: updatedPositions,
  } as T;

  return { updated, syncedCount };
}

export async function syncPortfolioMarketPrices(): Promise<SyncPortfolioResult<JakubPortfolioData>> {
  const current = loadJakubPortfolio();
  const tickers = current.positions.map((p) => p.ticker);

  const res = (await invokeEdge('sync', {
    query: { service: 'quotes', tickers: tickers.join(',') },
    body: { tickers },
  })) as SyncQuotesResponse;

  if (!res?.ok || !res?.quotes) {
    throw new Error(res?.error || 'Nie udało się pobrać aktualnych kursów rynkowych');
  }

  const rates = res.rates ?? {
    usdPln: 3.8404,
    eurPln: 4.375,
    date: getTodayWarsaw(),
  };

  const { updated, syncedCount } = updatePositionsWithQuotes(current, res.quotes);
  saveJakubPortfolio(updated);

  return {
    portfolio: updated,
    rates,
    syncedCount,
    timestamp: res.timestamp || new Date().toISOString(),
  };
}

export async function syncKondzioMarketPrices(): Promise<SyncPortfolioResult<KondzioPortfolioData>> {
  const current = loadKondzioPortfolio();
  const tickers = current.positions.map((p) => p.ticker);

  const res = (await invokeEdge('sync', {
    query: { service: 'quotes', tickers: tickers.join(',') },
    body: { tickers },
  })) as SyncQuotesResponse;

  if (!res?.ok || !res?.quotes) {
    throw new Error(res?.error || 'Nie udało się pobrać aktualnych kursów rynkowych');
  }

  const rates = res.rates ?? {
    usdPln: 3.8404,
    eurPln: 4.375,
    date: getTodayWarsaw(),
  };

  const { updated, syncedCount } = updatePositionsWithQuotes(current, res.quotes);
  saveKondzioPortfolio(updated);

  return {
    portfolio: updated,
    rates,
    syncedCount,
    timestamp: res.timestamp || new Date().toISOString(),
  };
}
