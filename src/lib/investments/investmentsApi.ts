/**
 * investmentsApi.ts — Warstwa dostępu do danych o transakcjach Kongresu USA i insiderów.
 * Zgodnie z AGENTS.md: zero bezpośrednich wywołań supabase.from w komponentach.
 */

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
