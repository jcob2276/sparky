/**
 * gpwInsidersService.ts — Usługa dla widoku Insiderzy GPW (ESPI).
 * 100% odblokowane dane (bez paywalla Pro, bez rozmyć KTO, z pełną alfą).
 */

import { orcaSelect } from './superinvestorsApi';
import {
  DEFAULT_GPW_INSIDER_KPIS,
  DEFAULT_GPW_CLUSTERS,
  DEFAULT_GPW_EFFECTIVENESS,
} from './gpwInsidersData';

export interface GpwInsiderKpis {
  purchases: number;
  sales: number;
  market90dPurchases: number;
  market90dSales: number;
  marketDeltaPoints: string;
  mostActiveTicker: string;
  mostActiveCount: number;
  medianPerCompany: number;
  tempo30d: number;
  tempoAvg90d: number;
  tempoGrowthPct: string;
}

export interface GpwInsiderCluster {
  id: string;
  ticker: string;
  companyName: string;
  buyersCount: number;
  tradesCount: number;
  totalValueFormatted: string;
  dateRange: string;
  insiders: string[];
}

export interface GpwInsiderEffectiveness {
  id: string;
  personName: string;
  isEntity?: boolean;
  evalBuysCount: number;
  median90s: number;
  market90s: number;
  diffPp: number;
  ticker: string;
  lastTransactionDate: string;
}

export interface GpwInsiderLiveTrade {
  id: string;
  company: string;
  ticker: string;
  side: 'buy' | 'sell' | 'other';
  transactionDate: string;
  reportDate: string;
  title: string;
  sourceUrl?: string;
}

export async function fetchGpwInsidersKpis(): Promise<GpwInsiderKpis> {
  return DEFAULT_GPW_INSIDER_KPIS;
}

export async function fetchGpwInsiderClusters(): Promise<GpwInsiderCluster[]> {
  return DEFAULT_GPW_CLUSTERS;
}

export async function fetchGpwInsiderEffectiveness(): Promise<GpwInsiderEffectiveness[]> {
  return DEFAULT_GPW_EFFECTIVENESS;
}

interface RawInsiderRow {
  id?: number | string;
  company?: string | null;
  ticker?: string | null;
  side?: string | null;
  transaction_date?: string | null;
  report_date?: string | null;
  title?: string | null;
}

export async function fetchGpwInsiderLiveFeed(params?: {
  query?: string;
  side?: 'all' | 'buy' | 'sell' | 'other';
}): Promise<GpwInsiderLiveTrade[]> {
  try {
    let path = 'vw_gpw_insider_public?select=id,company,ticker,side,transaction_date,report_date,title';
    if (params?.side && params.side !== 'all') {
      path += `&side=eq.${params.side}`;
    }
    if (params?.query?.trim()) {
      const q = encodeURIComponent(params.query.trim());
      path += `&or=(ticker.ilike.*${q}*,company.ilike.*${q}*,title.ilike.*${q}*)`;
    }
    path += '&order=report_date.desc&limit=60';

    const rows = await orcaSelect<RawInsiderRow>(path);
    return rows.map((r) => {
      const sideRaw = (r.side || 'other').toLowerCase();
      const side: 'buy' | 'sell' | 'other' =
        sideRaw === 'buy' ? 'buy' : sideRaw === 'sell' ? 'sell' : 'other';
      const repDate = r.report_date ? r.report_date.slice(0, 10) : '';
      const txDate = r.transaction_date ? r.transaction_date.slice(0, 10) : repDate;

      return {
        id: String(r.id || Math.random()),
        company: r.company || '—',
        ticker: r.ticker || '—',
        side,
        transactionDate: txDate,
        reportDate: repDate,
        title: r.title || 'Zawiadomienie w trybie art. 19 MAR',
        sourceUrl: `https://www.gpw.pl/szukaj?q=${encodeURIComponent(r.ticker || r.company || '')}`,
      };
    });
  } catch {
    return [];
  }
}
