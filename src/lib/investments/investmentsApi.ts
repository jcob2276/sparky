/**
 * investmentsApi.ts — Warstwa dostępu do danych o transakcjach Kongresu USA i insiderów.
 * Zgodnie z AGENTS.md: zero bezpośrednich wywołań supabase.from w komponentach.
 */

import { supabase } from '../supabase';
import type { Json } from '../database.types';
import { getTodayWarsaw, shiftDateStr } from '../date';
import { GPW_INSIDER_TRADES_SEED } from './gpwTradesSeed';

export interface InsiderTradeItem {
  id: string;
  source_id: string | null;
  filer_id: string | null;
  filer_name: string;
  branch: string | null;
  chamber: string | null;
  party: string | null;
  state: string | null;
  ticker: string | null;
  asset_name: string | null;
  asset_type: string | null;
  transaction_type: string;
  amount_low: number | null;
  amount_high: number | null;
  amount_label: string | null;
  transaction_date: string | null;
  filing_date: string | null;
  days_to_file: number | null;
  doc_url: string | null;
  created_at: string;
}

export interface InvestmentFilters {
  query?: string;
  filerName?: string;
  ticker?: string;
  party?: string;
  transactionType?: 'all' | 'purchase' | 'sale';
  minAmount?: number;
  market?: 'all' | 'us' | 'gpw';
  clusterOnly?: boolean;
  limit?: number;
}

export interface InvestmentStats {
  totalTrades: number;
  purchasesCount: number;
  salesCount: number;
  distinctFilers: number;
  recentCount30d: number;
}

const OPEN_FEED_URL =
  'https://raw.githubusercontent.com/kadoa-org/congress-trading-monitor/main/public/data/trades.json';

export async function fetchInsiderTrades(filters: InvestmentFilters = {}): Promise<InsiderTradeItem[]> {
  let q = supabase
    .from('insider_trades')
    .select('*')
    .order('filing_date', { ascending: false });

  if (filters.query && filters.query.trim()) {
    const term = `%${filters.query.trim()}%`;
    q = q.or(`filer_name.ilike.${term},ticker.ilike.${term},asset_name.ilike.${term}`);
  }

  if (filters.filerName) {
    q = q.ilike('filer_name', `%${filters.filerName}%`);
  }

  if (filters.ticker) {
    q = q.eq('ticker', filters.ticker.trim().toUpperCase());
  }

  if (filters.party) {
    q = q.eq('party', filters.party.trim().toUpperCase());
  }

  if (filters.market === 'gpw') {
    q = q.eq('state', 'PL');
  } else if (filters.market === 'us') {
    q = q.neq('state', 'PL');
  }

  if (filters.transactionType && filters.transactionType !== 'all') {
    if (filters.transactionType === 'purchase') {
      q = q.or('transaction_type.ilike.%Purchase%,transaction_type.ilike.%Buy%');
    } else if (filters.transactionType === 'sale') {
      q = q.or('transaction_type.ilike.%Sale%,transaction_type.ilike.%Sell%');
    }
  }

  if (filters.minAmount) {
    q = q.gte('amount_high', filters.minAmount);
  }

  const limit = filters.limit ?? 60;
  q = q.limit(limit);

  const { data, error } = await q;
  if (error) {
    console.error('[investmentsApi] fetch error:', error.message);
    throw error;
  }

  const items = (data as InsiderTradeItem[]) || [];

  if (filters.clusterOnly) {
    const clusterTickers = detectClusterTickers(items);
    return items.filter((t) => t.ticker && clusterTickers.has(t.ticker));
  }

  return items;
}

export function detectClusterTickers(trades: InsiderTradeItem[]): Set<string> {
  const counts = new Map<string, number>();
  for (const t of trades) {
    if (!t.ticker) continue;
    const isBuy = (t.transaction_type || '').toLowerCase().includes('buy') || (t.transaction_type || '').toLowerCase().includes('purchase');
    if (isBuy) {
      counts.set(t.ticker, (counts.get(t.ticker) || 0) + 1);
    }
  }
  const clusterSet = new Set<string>();
  for (const [ticker, count] of counts.entries()) {
    if (count >= 2) clusterSet.add(ticker);
  }
  return clusterSet;
}

export async function fetchInvestmentStats(): Promise<InvestmentStats> {
  const { data, error } = await supabase
    .from('insider_trades')
    .select('id, transaction_type, filer_name, filing_date');

  if (error || !data) {
    return { totalTrades: 0, purchasesCount: 0, salesCount: 0, distinctFilers: 0, recentCount30d: 0 };
  }

  let purchases = 0;
  let sales = 0;
  const filers = new Set<string>();
  const cutoffStr = shiftDateStr(getTodayWarsaw(), -30);
  let recent30d = 0;

  for (const item of data) {
    if (item.filer_name) filers.add(item.filer_name);
    const type = (item.transaction_type || '').toLowerCase();
    if (type.includes('purchase') || type.includes('buy')) purchases++;
    if (type.includes('sale') || type.includes('sell')) sales++;
    if (item.filing_date && item.filing_date >= cutoffStr) recent30d++;
  }

  return {
    totalTrades: data.length,
    purchasesCount: purchases,
    salesCount: sales,
    distinctFilers: filers.size,
    recentCount30d: recent30d,
  };
}

export async function syncInsiderTradesDirect(limit = 400): Promise<{ count: number }> {
  const res = await fetch(OPEN_FEED_URL, {
    headers: { 'User-Agent': 'Sparky-Web-App/1.0' },
  });

  if (!res.ok) throw new Error(`Feed HTTP ${res.status}`);
  const rawList = await res.json();
  if (!Array.isArray(rawList)) throw new Error('Invalid feed format');

interface RawTradeJson {
  [key: string]: Json | undefined;
  id?: string;
  source_id?: string;
  filing_date?: string;
  filer_name?: string;
  filer_id?: string;
  branch?: string;
  chamber?: string;
  party?: string;
  state?: string;
  ticker?: string;
  asset_name?: string;
  asset_type?: string;
  transaction_type?: string;
  amount_range_low?: number;
  amount_range_high?: number;
  amount_range_label?: string;
  transaction_date?: string;
  days_to_file?: number;
  doc_url?: string;
}

  const slice = (rawList as RawTradeJson[]).slice(0, limit);
  const records = slice.map((t) => ({
    id: t.id || `${t.source_id || 't'}_${t.filing_date || 'd'}_${t.filer_name}_${t.ticker || 'na'}_${t.amount_range_low || 0}`,
    source_id: t.source_id || null,
    filer_id: t.filer_id || null,
    filer_name: t.filer_name || 'Nieznany',
    branch: t.branch || null,
    chamber: t.chamber || null,
    party: t.party || null,
    state: t.state || null,
    ticker: t.ticker ? String(t.ticker).trim().toUpperCase() : null,
    asset_name: t.asset_name || null,
    asset_type: t.asset_type || null,
    transaction_type: t.transaction_type || 'Unknown',
    amount_low: typeof t.amount_range_low === 'number' ? t.amount_range_low : null,
    amount_high: typeof t.amount_range_high === 'number' ? t.amount_range_high : null,
    amount_label: t.amount_range_label || null,
    transaction_date: t.transaction_date || null,
    filing_date: t.filing_date || null,
    days_to_file: typeof t.days_to_file === 'number' ? t.days_to_file : null,
    doc_url: t.doc_url || null,
    raw_data: t,
  }));

  const chunkSize = 100;
  for (let i = 0; i < records.length; i += chunkSize) {
    const chunk = records.slice(i, i + chunkSize);
    const { error } = await supabase.from('insider_trades').upsert(chunk, { onConflict: 'id' });
    if (error) throw error;
  }

  // Also sync Polish GPW MAR trades
  const { error: gpwErr } = await supabase.from('insider_trades').upsert(GPW_INSIDER_TRADES_SEED, { onConflict: 'id' });
  if (gpwErr) console.warn('[investmentsApi] GPW seed warning:', gpwErr.message);

  return { count: records.length + GPW_INSIDER_TRADES_SEED.length };
}
