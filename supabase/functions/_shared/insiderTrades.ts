/**
 * insiderTrades.ts — synchronizacja SEC Form 4 i zapytania do wspólnej bazy ujawnień.
 * Historyczne wpisy Kongresu pozostają dostępne; nowe transakcje pochodzą z EDGAR.
 */

import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

export interface InsiderTrade {
  id: string;
  source_id?: string | null;
  filer_id?: string | null;
  filer_name: string;
  branch?: string | null;
  chamber?: string | null;
  party?: string | null;
  state?: string | null;
  ticker?: string | null;
  asset_name?: string | null;
  asset_type?: string | null;
  transaction_type: string;
  amount_low?: number | null;
  amount_high?: number | null;
  amount_label?: string | null;
  transaction_date?: string | null;
  filing_date?: string | null;
  days_to_file?: number | null;
  doc_url?: string | null;
  raw_data?: unknown;
  created_at?: string;
}

import { syncSecForm4 } from './secForm4Sync.ts';
export async function syncInsiderTrades(supabase: SupabaseClient, options: { limit?: number; days?: number } = {}) {
  try { return await syncSecForm4(supabase, options); }
  catch (err) { return { success: false, synced: 0, error: err instanceof Error ? err.message : String(err) }; }
}
export async function getRecentInsiderTrades(
  supabase: SupabaseClient,
  options: {
    filerName?: string;
    ticker?: string;
    party?: string;
    transactionType?: "Purchase" | "Sale";
    limit?: number;
    minAmount?: number;
  } = {},
): Promise<InsiderTrade[]> {
  let query = supabase
    .from("insider_trades")
    .select("*")
    .order("filing_date", { ascending: false });

  if (options.filerName) {
    query = query.ilike("filer_name", `%${options.filerName}%`);
  }

  if (options.ticker) {
    query = query.eq("ticker", options.ticker.trim().toUpperCase());
  }

  if (options.party) {
    query = query.eq("party", options.party.trim().toUpperCase());
  }

  if (options.transactionType) {
    query = query.ilike("transaction_type", `%${options.transactionType}%`);
  }

  if (options.minAmount) {
    query = query.gte("amount_high", options.minAmount);
  }

  const limit = options.limit ?? 10;
  query = query.limit(limit);

  const { data, error } = await query;
  if (error) {
    console.error("[insiderTrades] query error:", error.message);
    return [];
  }

  return (data as InsiderTrade[]) || [];
}
