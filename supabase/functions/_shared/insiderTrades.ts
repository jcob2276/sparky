/**
 * insiderTrades.ts — synchronizacja i zapytania do bazy danych transakcji Kongresu,
 * Senatu oraz insiderów (darmowe, otwarte źródła rządowe STOCK Act / SEC).
 */

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

const DATA_FEED_URL = "https://raw.githubusercontent.com/kadoa-org/congress-trading-monitor/main/public/data/trades.json";

/**
 * Zaciąga najnowsze transakcje z otwartego feedu i zapisuje je w Supabase.
 */
export async function syncInsiderTrades(
  supabase: any,
  options: { limit?: number } = {},
): Promise<{ success: boolean; synced: number; error?: string }> {
  try {
    const res = await fetch(DATA_FEED_URL, {
      headers: { "User-Agent": "Sparky-Personal-OS/1.0" },
    });

    if (!res.ok) {
      throw new Error(`Failed to fetch trades feed: HTTP ${res.status}`);
    }

    const rawTrades = await res.json();
    if (!Array.isArray(rawTrades)) {
      throw new Error("Invalid trades feed format: expected array");
    }

    const limit = options.limit ?? 500;
    const toProcess = rawTrades.slice(0, limit);

    const records: InsiderTrade[] = toProcess.map((t: any) => {
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

    // Batch upsert in chunks of 100
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

    return { success: true, synced: totalUpserted };
  } catch (err: any) {
    console.error("[insiderTrades] sync error:", err);
    return { success: false, synced: 0, error: err.message };
  }
}

/**
 * Odpytuje bazę o transakcje według elastycznych filtrów.
 */
export async function getRecentInsiderTrades(
  supabase: any,
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
