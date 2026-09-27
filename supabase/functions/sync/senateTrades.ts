/**
 * senateTrades.ts — Bezpośrednia synchronizacja transakcji Senatu USA
 * z otwartego rejestru GitHub (timothycarambat/senate-stock-watcher-data).
 */

import { createServiceClient } from '../_shared/supabase.ts';

interface SenateRawTransaction {
  transaction_date?: string;
  owner?: string;
  ticker?: string;
  asset_description?: string;
  asset_type?: string;
  type?: string;
  amount?: string;
  comment?: string;
  senator?: string;
  ptr_link?: string;
}

function parseDateIso(raw?: string): string | null {
  if (!raw) return null;
  const parts = raw.split('/');
  if (parts.length === 3) {
    const mm = parts[0].padStart(2, '0');
    const dd = parts[1].padStart(2, '0');
    const yyyy = parts[2];
    return `${yyyy}-${mm}-${dd}`;
  }
  return raw;
}

function parseAmountRange(raw?: string): { low: number; high: number } {
  if (!raw) return { low: 0, high: 0 };
  const numbers = raw.replace(/[^0-9-]/g, ' ').trim().split(/\s+/).map(Number).filter(Boolean);
  if (numbers.length >= 2) {
    return { low: numbers[0], high: numbers[1] };
  } else if (numbers.length === 1) {
    return { low: numbers[0], high: numbers[0] };
  }
  return { low: 0, high: 0 };
}

export async function runSenateSync(_req: Request): Promise<unknown> {
  const url = 'https://raw.githubusercontent.com/timothycarambat/senate-stock-watcher-data/master/aggregate/all_transactions.json';
  const res = await fetch(url, {
    headers: { 'User-Agent': 'SparkyOS jakub@sparky.local' },
    signal: AbortSignal.timeout(15000),
  });

  if (!res.ok) {
    throw new Error(`GitHub Senate feed odpowiedział kodem ${res.status}`);
  }

  const rawList = (await res.json()) as SenateRawTransaction[];
  if (!Array.isArray(rawList) || rawList.length === 0) {
    return { ok: true, count: 0, message: 'Brak transakcji w feedzie Senatu' };
  }

  const client = createServiceClient();

  // Get politicians map for senate
  const { data: politicians } = await client
    .from('politicians')
    .select('id, display_name, party, state');
  const polNameToId = new Map<string, string>();
  ((politicians as Array<{ id: string; display_name: string }>) || []).forEach((p) => {
    polNameToId.set(p.display_name.toLowerCase().trim(), p.id);
  });

  // Take the most recent 300 transactions
  const recent = rawList.slice(0, 300);

  const payload = recent.map((t, idx) => {
    const senatorName = (t.senator || 'Senator USA').trim();
    const polId = polNameToId.get(senatorName.toLowerCase()) || null;
    const ticker = (t.ticker || '').replace(/[^A-Za-z0-9.-]/g, '').toUpperCase() || null;
    const date = parseDateIso(t.transaction_date) || new Date().toISOString().slice(0, 10);
    const amounts = parseAmountRange(t.amount);
    const isBuy = (t.type || '').toLowerCase().includes('purchase');
    const transactionType = isBuy ? 'buy' : 'sell';

    const id = `senate_${date}_${ticker || 'notick'}_${senatorName.replace(/\s+/g, '_')}_${idx}`;

    return {
      id,
      politician_id: polId,
      ticker,
      asset_description: t.asset_description || t.asset_type || 'Akcje',
      transaction_date: date,
      disclosure_date: date,
      transaction_type: transactionType,
      amount_low: amounts.low,
      amount_high: amounts.high,
      source: 'senate_stock_watcher',
      external_id: t.ptr_link || null,
    };
  });

  const { error: upsertError } = await client
    .from('stock_act_trades')
    .upsert(payload, { ignoreDuplicates: true });

  if (upsertError) {
    console.warn('[senateSync] Error inserting senate trades:', upsertError.message);
  }

  return {
    ok: true,
    count: payload.length,
    timestamp: new Date().toISOString(),
  };
}
