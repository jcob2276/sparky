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
  avgCostCurrency?: 'PLN' | 'USD' | 'EUR';
  avgCostOriginal?: number | null;
}

type HoldingRow = {
  id: string;
  ticker: string;
  name: string;
  asset_class: string;
  quantity: number | string;
  avg_cost_pln: number | string;
  target_weight_pct: number | string | null;
  avg_cost_currency?: string;
  avg_cost_original?: number | string | null;
  snapshot_price_pln?: number | string | null;
  snapshot_source?: string | null;
  snapshot_as_of?: string | null;
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
    ...(row.avg_cost_currency ? { avgCostCurrency: ['USD', 'EUR'].includes(row.avg_cost_currency) ? row.avg_cost_currency as 'USD' | 'EUR' : 'PLN' as const,
      avgCostOriginal: row.avg_cost_original == null ? null : Number(row.avg_cost_original),
      snapshotPricePln: row.snapshot_price_pln == null ? null : Number(row.snapshot_price_pln),
      snapshotSource: row.snapshot_source ?? null, snapshotAsOf: row.snapshot_as_of ?? null } : {}),
  };
}

export function normalizeTicker(raw: string): string {
  return raw.trim().toUpperCase();
}

async function fetchHoldings(userId: string): Promise<HoldingInput[]> {
  const { data, error } = await supabase
    .from('finance_holdings')
    .select('id, ticker, name, asset_class, quantity, avg_cost_pln, target_weight_pct, avg_cost_currency, avg_cost_original, snapshot_price_pln, snapshot_source, snapshot_as_of')
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
    if (userId) {
      void qc.invalidateQueries({ queryKey: financeKeys.holdings(userId) });
      void qc.invalidateQueries({ queryKey: financeKeys.bundle(userId) });
    }
  };

  const saveHolding = useMutation({
    mutationFn: async (input: HoldingFormInput & { id?: string }) => {
      if (!userId) throw new Error('Brak użytkownika');
      if (!Number.isFinite(input.quantity) || input.quantity < 0 || !Number.isFinite(input.avgCostPln) || input.avgCostPln < 0
        || (input.avgCostOriginal != null && (!Number.isFinite(input.avgCostOriginal) || input.avgCostOriginal < 0))) throw new Error('Niepoprawna ilość lub cena zakupu');
      const payload = {
        ticker: normalizeTicker(input.ticker),
        name: input.name.trim(),
        asset_class: input.assetClass,
        quantity: input.quantity,
        avg_cost_pln: input.avgCostPln,
        target_weight_pct: input.targetWeightPct,
        avg_cost_currency: input.avgCostCurrency ?? 'PLN',
        avg_cost_original: input.avgCostOriginal ?? input.avgCostPln,
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
    mutationFn: async (input: { holding: HoldingInput; units: number; pricePln: number; accountId: string | null }) => {
      if (!userId) throw new Error('Brak użytkownika');
      const { holding, units, pricePln } = input;
      if (holding.avgCostCurrency && holding.avgCostCurrency !== 'PLN') throw new Error('Przed dokupieniem uzupełnij średni historyczny koszt w PLN i wybierz PLN jako walutę kosztu.');
      if (!Number.isFinite(units) || units <= 0 || !Number.isFinite(pricePln) || pricePln <= 0) throw new Error('Podaj poprawną ilość i cenę zakupu');
      const { error } = await supabase.rpc('record_finance_holding_purchase', {
        p_holding_id: holding.id, p_units: units, p_price_pln: pricePln, p_account_id: input.accountId ?? undefined,
      });
      if (error) throw new Error(error.message);
    },
    onSuccess: refresh,
  });

  return { saveHolding, removeHolding, addPurchase };
}

export type HoldingMutations = ReturnType<typeof useHoldingMutations>;
