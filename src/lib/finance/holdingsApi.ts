import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { HoldingAssetClass, HoldingInput, HoldingQuote } from '@vanguard/domain';
import { supabase, invokeEdge } from '../supabase';
import { financeKeys } from '../queryKeys';

export interface HoldingFormInput {
  ticker: string;
  name: string;
  assetClass: HoldingAssetClass;
  quantity: number;
  avgCostPln: number;
  targetWeightPct: number | null;
}

type HoldingRow = {
  id: string;
  ticker: string;
  name: string;
  asset_class: string;
  quantity: number | string;
  avg_cost_pln: number | string;
  target_weight_pct: number | string | null;
};

const ASSET_CLASSES: HoldingAssetClass[] = ['etf', 'stock', 'bond', 'crypto', 'other'];

export function mapHolding(row: HoldingRow): HoldingInput {
  const asset = ASSET_CLASSES.find((item) => item === row.asset_class) ?? 'other';
  return {
    id: row.id,
    ticker: row.ticker,
    name: row.name,
    assetClass: asset,
    quantity: Number(row.quantity),
    avgCostPln: Number(row.avg_cost_pln),
    targetWeightPct: row.target_weight_pct == null ? null : Number(row.target_weight_pct),
  };
}

export function normalizeTicker(raw: string): string {
  return raw.trim().toUpperCase();
}

async function fetchHoldings(userId: string): Promise<HoldingInput[]> {
  const { data, error } = await supabase
    .from('finance_holdings')
    .select('id, ticker, name, asset_class, quantity, avg_cost_pln, target_weight_pct')
    .eq('user_id', userId)
    .order('created_at');
  if (error) throw new Error(error.message);
  return (data ?? []).map(mapHolding);
}

export function useHoldings(userId: string | undefined) {
  return useQuery({
    queryKey: financeKeys.holdings(userId ?? ''),
    queryFn: () => fetchHoldings(userId!),
    enabled: Boolean(userId),
  });
}

interface RawQuote {
  ticker?: string;
  symbol?: string;
  pricePln?: number | null;
  changePct?: number | null;
  quoteAsOf?: string | null;
}

const QUOTE_BATCH = 30;

export function parseQuotes(response: unknown): Record<string, HoldingQuote> {
  const quotes = (response as { quotes?: Record<string, RawQuote> } | null)?.quotes;
  const out: Record<string, HoldingQuote> = {};
  if (!quotes) return out;
  for (const [key, quote] of Object.entries(quotes)) {
    const price = quote.pricePln;
    if (typeof price !== 'number' || !Number.isFinite(price) || price <= 0) continue;
    out[key.toUpperCase()] = {
      pricePln: price,
      changePct: typeof quote.changePct === 'number' ? quote.changePct : null,
      asOf: quote.quoteAsOf ?? null,
    };
  }
  return out;
}

async function fetchQuotes(tickers: string[]): Promise<Record<string, HoldingQuote>> {
  const merged: Record<string, HoldingQuote> = {};
  for (let i = 0; i < tickers.length; i += QUOTE_BATCH) {
    const batch = tickers.slice(i, i + QUOTE_BATCH);
    try {
      const response = await invokeEdge('sync', { query: { service: 'quotes' }, body: { tickers: batch, range: '5d' } });
      Object.assign(merged, parseQuotes(response));
    } catch (err: unknown) {
      if (i === 0 && tickers.length <= QUOTE_BATCH) throw err;
    }
  }
  return merged;
}

/** Notowania na żywo (PLN + zmiana dzienna). Odświeżane co minutę, gdy karta jest aktywna. */
export function useHoldingQuotes(tickers: string[]) {
  const sorted = [...new Set(tickers.map(normalizeTicker))].sort();
  return useQuery({
    queryKey: financeKeys.quotes(sorted),
    queryFn: () => fetchQuotes(sorted),
    enabled: sorted.length > 0,
    staleTime: 30_000,
    refetchInterval: 60_000,
    retry: 1,
  });
}

export function useHoldingMutations(userId: string | undefined) {
  const qc = useQueryClient();
  const refresh = () => {
    if (userId) void qc.invalidateQueries({ queryKey: financeKeys.holdings(userId) });
  };

  const saveHolding = useMutation({
    mutationFn: async (input: HoldingFormInput & { id?: string }) => {
      if (!userId) throw new Error('Brak użytkownika');
      const payload = {
        ticker: normalizeTicker(input.ticker),
        name: input.name.trim(),
        asset_class: input.assetClass,
        quantity: input.quantity,
        avg_cost_pln: input.avgCostPln,
        target_weight_pct: input.targetWeightPct,
        updated_at: new Date().toISOString(),
      };
      const query = input.id
        ? supabase.from('finance_holdings').update(payload).eq('id', input.id).eq('user_id', userId)
        : supabase.from('finance_holdings').insert({ ...payload, user_id: userId });
      const { error } = await query;
      if (error) throw new Error(error.code === '23505' ? 'Ta pozycja już jest w portfelu' : error.message);
    },
    onSuccess: refresh,
  });

  const removeHolding = useMutation({
    mutationFn: async (id: string) => {
      if (!userId) throw new Error('Brak użytkownika');
      const { error } = await supabase.from('finance_holdings').delete().eq('id', id).eq('user_id', userId);
      if (error) throw new Error(error.message);
    },
    onSuccess: refresh,
  });

  /** Dokupienie: nowa ilość i średnia ważona ceny zakupu. */
  const addPurchase = useMutation({
    mutationFn: async (input: { holding: HoldingInput; units: number; pricePln: number }) => {
      if (!userId) throw new Error('Brak użytkownika');
      const { holding, units, pricePln } = input;
      const quantity = holding.quantity + units;
      const avg = quantity > 0 ? (holding.quantity * holding.avgCostPln + units * pricePln) / quantity : 0;
      const { error } = await supabase.from('finance_holdings')
        .update({ quantity, avg_cost_pln: Math.round(avg * 100) / 100, updated_at: new Date().toISOString() })
        .eq('id', holding.id).eq('user_id', userId);
      if (error) throw new Error(error.message);
    },
    onSuccess: refresh,
  });

  return { saveHolding, removeHolding, addPurchase };
}

export type HoldingMutations = ReturnType<typeof useHoldingMutations>;
