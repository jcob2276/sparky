/**
 * insiderTrades.ts — synchronizacja i zapytania do bazy danych transakcji Kongresu,
 * Senatu oraz insiderów (darmowe, otwarte źródła rządowe STOCK Act / SEC).
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

interface RawFeedTrade {
  id?: string;
  source_id?: string;
  filer_id?: string;
  filer_name?: string;
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
  filing_date?: string;
  days_to_file?: number;
  doc_url?: string;
}

const DATA_FEED_URL = "https://raw.githubusercontent.com/kadoa-org/congress-trading-monitor/main/public/data/trades.json";

/**
 * Zaciąga najnowsze transakcje z otwartego feedu i zapisuje je w Supabase.
 */
export async function syncInsiderTrades(
  supabase: SupabaseClient,
  options: { limit?: number } = {},
): Promise<{ success: boolean; synced: number; error?: string }> {
  try {
    const res = await fetch(DATA_FEED_URL, {
      headers: { "User-Agent": "Sparky-Personal-OS/1.0" },
    });

    if (!res.ok) {
      throw new Error(`Failed to fetch trades feed: HTTP ${res.status}`);
    }

    const rawTrades = (await res.json()) as RawFeedTrade[];
    if (!Array.isArray(rawTrades)) {
      throw new Error("Invalid trades feed format: expected array");
    }

    const limit = options.limit ?? 500;
    const toProcess = rawTrades.slice(0, limit);

    const records: InsiderTrade[] = toProcess.map((t) => {
      const id = t.id || `${t.source_id || "trade"}_${t.filing_date || "date"}_${t.filer_name}_${t.ticker || "na"}_${t.amount_range_low || 0}`;
      return {
        id,
        source_id: t.source_id || null,
        filer_id: t.filer_id || null,
        filer_name: t.filer_name || "Nieznany",
        branch: t.branch || null,
        chamber: t.chamber || null,
        party: t.party || null,
        state: t.state || null,
        ticker: t.ticker ? String(t.ticker).trim().toUpperCase() : null,
        asset_name: t.asset_name || null,
        asset_type: t.asset_type || null,
        transaction_type: t.transaction_type || "Unknown",
        amount_low: typeof t.amount_range_low === "number" ? t.amount_range_low : null,
        amount_high: typeof t.amount_range_high === "number" ? t.amount_range_high : null,
        amount_label: t.amount_range_label || null,
        transaction_date: t.transaction_date || null,
        filing_date: t.filing_date || null,
        days_to_file: typeof t.days_to_file === "number" ? t.days_to_file : null,
        doc_url: t.doc_url || null,
        raw_data: t,
      };
    });

    // Batch upsert in chunks of 100 to insider_trades
    const chunkSize = 100;
    let totalUpserted = 0;

    for (let i = 0; i < records.length; i += chunkSize) {
      const chunk = records.slice(i, i + chunkSize);
      const { error } = await supabase
        .from("insider_trades")
        .upsert(chunk, { onConflict: "id" });

      if (error) {
        console.error(`[insiderTrades] batch upsert error at index ${i}:`, error.message);
        throw error;
      }
      totalUpserted += chunk.length;
    }

    // Mirror into stock_act_trades so Congress overview & cluster buy radar benefit automatically
    const stockActPayload = records
      .filter((r) => r.ticker && r.ticker !== "—")
      .map((r) => ({
        id: `kadoa_${r.id}`,
        ticker: r.ticker,
        asset_description: r.asset_name || r.ticker || "Akcje",
        transaction_date: r.transaction_date || r.filing_date || new Date().toISOString().slice(0, 10),
        disclosure_date: r.filing_date || r.transaction_date || new Date().toISOString().slice(0, 10),
        transaction_type: (r.transaction_type || "").toLowerCase().includes("sale") ? "sell" : "buy",
        amount_low: r.amount_low || 0,
        amount_high: r.amount_high || 0,
        source: "congress_trading_monitor",
        external_id: r.doc_url || null,
      }));

    for (let i = 0; i < stockActPayload.length; i += chunkSize) {
      const chunk = stockActPayload.slice(i, i + chunkSize);
      await supabase
        .from("stock_act_trades")
        .upsert(chunk, { ignoreDuplicates: true });
    }

    return { success: true, synced: totalUpserted };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[insiderTrades] sync error:", msg);
    return { success: false, synced: 0, error: msg };
  }
}

/**
 * Odpytuje bazę o transakcje według elastycznych filtrów.
 */
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
