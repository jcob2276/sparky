/**
 * superinvestorsApi.ts — Pobieranie na żywo wszystkich 59 superinwestorów 13F,
 * ich pozycji portfelowych oraz konsensusu rynkowego.
 */

import { INVESTORS_13F_DATA, Holding13F } from './investors13FData';

const ORCA_SUPABASE_URL = 'https://rtnehnbvteuipkoatdlz.supabase.co/rest/v1';
const ORCA_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ0bmVobmJ2dGV1aXBrb2F0ZGx6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA1NjQyOTMsImV4cCI6MjA5NjE0MDI5M30.Hy_bqwnNNbp0-h-OSiJ_dITeXPmD47mOyd9xLeFVDHw';

export interface SuperinvestorItem {
  id: string;
  slug: string;
  name: string;
  fundName: string;
  cik: string;
  description: string;
  category: string;
  tier: string;
  isActive: boolean;
  aumFormatted?: string;
  periodEnded?: string;
  filingDate?: string;
  topHoldingsCount?: number;
}

export interface LiveHoldingItem {
  ticker: string;
  name: string;
  weightPercent: number;
  valueUsd: number;
  changeType: 'new' | 'increased' | 'reduced' | 'unchanged' | 'sold';
  shares: number;
  sector: string;
}

const HEADERS = {
  apikey: ORCA_ANON_KEY,
  Authorization: `Bearer ${ORCA_ANON_KEY}`,
};

export async function fetchAllSuperinvestors(): Promise<SuperinvestorItem[]> {
  try {
    const res = await fetch(
      `${ORCA_SUPABASE_URL}/investors?is_active=eq.true&order=display_name.asc`,
      { headers: HEADERS }
    );
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    if (!Array.isArray(data) || data.length === 0) {
      return fallbackInvestors();
    }

    interface RawInvestor {
      id: string;
      slug: string;
      display_name: string;
      fund_name: string;
      cik: string;
      description: string;
      category: string;
      tier: string;
      is_active: boolean;
    }

    return data.map((d: RawInvestor) => ({
      id: d.id,
      slug: d.slug,
      name: d.display_name,
      fundName: d.fund_name,
      cik: d.cik || '—',
      description: d.description || 'Portfel funduszu 13F złożony w SEC.',
      category: d.category || 'value',
      tier: d.tier || 'free',
      isActive: Boolean(d.is_active),
      aumFormatted: 'Dane 13F',
      periodEnded: '2026-06-30',
      filingDate: '2026-08-14',
    }));
  } catch (err) {
    console.warn('[superinvestorsApi] fetchAllSuperinvestors fallback:', err);
    return fallbackInvestors();
  }
}

export async function fetchInvestorHoldings(investorId: string): Promise<LiveHoldingItem[]> {
  try {
    const res = await fetch(
      `${ORCA_SUPABASE_URL}/vw_holdings_changes?investor_id=eq.${investorId}&order=value_now.desc.nullslast&limit=30`,
      { headers: HEADERS }
    );
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    if (!Array.isArray(data) || data.length === 0) {
      return fallbackHoldings(investorId);
    }

    interface RawHolding {
      ticker?: string;
      company_name?: string;
      weight_pct?: number;
      value_now?: number;
      change_type?: string;
      shares_now?: number;
    }

    return data.map((h: RawHolding) => {
      let mappedChange: LiveHoldingItem['changeType'] = 'unchanged';
      if (h.change_type === 'new') mappedChange = 'new';
      else if (h.change_type === 'increased') mappedChange = 'increased';
      else if (h.change_type === 'decreased') mappedChange = 'reduced';
      else if (h.change_type === 'sold') mappedChange = 'sold';

      return {
        ticker: h.ticker || '—',
        name: h.company_name || 'Spółka publiczna',
        weightPercent: typeof h.weight_pct === 'number' ? h.weight_pct : 0,
        valueUsd: typeof h.value_now === 'number' ? h.value_now : 0,
        changeType: mappedChange,
        shares: typeof h.shares_now === 'number' ? h.shares_now : 0,
        sector: 'SEC 13F',
      };
    });
  } catch (err) {
    console.warn('[superinvestorsApi] fetchInvestorHoldings fallback:', err);
    return fallbackHoldings(investorId);
  }
}

function fallbackInvestors(): SuperinvestorItem[] {
  return INVESTORS_13F_DATA.map((inv) => ({
    id: inv.id,
    slug: inv.id,
    name: inv.name,
    fundName: inv.fundName,
    cik: inv.cik,
    description: inv.description,
    category: 'value',
    tier: 'free',
    isActive: true,
    aumFormatted: inv.aumFormatted,
    periodEnded: inv.periodEnded,
    filingDate: inv.filingDate,
  }));
}

function fallbackHoldings(investorId: string): LiveHoldingItem[] {
  const match = INVESTORS_13F_DATA.find((inv) => inv.id === investorId) || INVESTORS_13F_DATA[0];
  return match.holdings.map((h: Holding13F) => ({
    ticker: h.ticker,
    name: h.name,
    weightPercent: h.weightPercent,
    valueUsd: h.valueUsd,
    changeType: h.changeType === 'sold_out' ? 'sold' : h.changeType,
    shares: h.shares,
    sector: h.sector,
  }));
}

export interface LiveConsensusItem {
  ticker: string;
  name: string;
  buyers: number;
  sellers: number;
  totalFunds: number;
  netScore: number;
  movementType: 'accumulation' | 'distribution';
}

export async function fetchLiveConsensus(): Promise<LiveConsensusItem[]> {
  try {
    const res = await fetch(`${ORCA_SUPABASE_URL}/vw_consensus?order=net_buyers.desc&limit=60`, {
      headers: HEADERS,
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    if (!Array.isArray(data)) return [];

    interface RawConsensus {
      ticker?: string;
      company_name?: string;
      buyers?: number;
      sellers?: number;
      net_buyers?: number;
    }

    return data
      .filter((d: RawConsensus) => Boolean(d.ticker))
      .map((d: RawConsensus) => {
        const net = d.net_buyers || 0;
        return {
          ticker: d.ticker || '—',
          name: d.company_name || 'Spółka',
          buyers: d.buyers || 0,
          sellers: d.sellers || 0,
          totalFunds: (d.buyers || 0) + (d.sellers || 0),
          netScore: net,
          movementType: net >= 0 ? 'accumulation' : 'distribution',
        };
      });
  } catch (err) {
    console.warn('[superinvestorsApi] fetchLiveConsensus error:', err);
    return [];
  }
}

