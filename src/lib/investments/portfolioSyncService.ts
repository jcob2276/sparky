/**
 * portfolioSyncService.ts — Synchronizacja wycen portfela IKE Jakuba z rynkiem.
 * Pobiera bieżące notowania z giełd (GPW, Nasdaq, Xetra) oraz oficjalne kursy walut z NBP.
 */

import { invokeEdge } from '../supabase';
import { getTodayWarsaw } from '../date';
import type { SyncQuotesResponse } from '../edgeTypes';
import { loadJakubPortfolio, saveJakubPortfolio, type JakubPortfolioData } from './jakubPortfolioStorage';

export interface SyncPortfolioResult {
  portfolio: JakubPortfolioData;
  rates: { usdPln: number; eurPln: number; date: string };
  syncedCount: number;
  timestamp: string;
}

export async function syncPortfolioMarketPrices(): Promise<SyncPortfolioResult> {
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

  let syncedCount = 0;

  const updatedPositions = current.positions.map((pos) => {
    const q =
      res.quotes?.[pos.ticker] ||
      res.quotes?.[`${pos.ticker}.WA`] ||
      res.quotes?.[`${pos.ticker}.DE`];

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

  const updatedPortfolio: JakubPortfolioData = {
    ...current,
    marketValuePln,
    totalValuePln,
    totalPnlPln,
    totalPnlPct,
    lastUpdated: new Date().toISOString(),
    positions: updatedPositions,
  };

  saveJakubPortfolio(updatedPortfolio);

  return {
    portfolio: updatedPortfolio,
    rates,
    syncedCount,
    timestamp: res.timestamp || new Date().toISOString(),
  };
}
