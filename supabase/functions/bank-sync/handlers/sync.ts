import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { safeExecute } from '../../_shared/supabase.ts';
import {
  type BankTransactionRow, EbError, ebBalances, ebTransactions, mapTransaction,
} from '../../_shared/enableBanking.ts';

const RECENT_DAYS = 90;
// Pekao oddaje ok. 4 lat historii przy jednym date_from; okna z date_to bank odrzuca (ASPSP_ERROR).
const HISTORY_DAYS = 1400;
const MAX_PAGES = 150;
const UPSERT_CHUNK = 500;

interface AccountRow { id: string; user_id: string; account_uid: string; history_complete: boolean }

const day = (d: Date): string => d.toISOString().slice(0, 10);
const shift = (iso: string, days: number): string => day(new Date(Date.parse(`${iso}T00:00:00Z`) + days * 86400e3));

async function fetchSince(accountUid: string, from: string): Promise<BankTransactionRow[]> {
  const rows: BankTransactionRow[] = [];
  let key: string | null | undefined;
  for (let page = 0; page < MAX_PAGES; page++) {
    const res = await ebTransactions(accountUid, from, key);
    for (const t of res.transactions ?? []) {
      const row = mapTransaction(t);
      if (row) rows.push(row);
    }
    key = res.continuation_key;
    if (!key) break;
  }
  return rows;
}

async function store(db: SupabaseClient, account: AccountRow, rows: BankTransactionRow[]): Promise<void> {
  for (let i = 0; i < rows.length; i += UPSERT_CHUNK) {
    const chunk = rows.slice(i, i + UPSERT_CHUNK).map((r) => ({ ...r, user_id: account.user_id, account_id: account.id }));
    await safeExecute(db.from('bank_transactions').upsert(chunk, { onConflict: 'account_id,transaction_id' }));
  }
}

async function syncBalance(db: SupabaseClient, account: AccountRow): Promise<void> {
  const { balances } = await ebBalances(account.account_uid);
  const best = balances?.find((b) => b.balance_type === 'ITBD') ?? balances?.[0];
  if (!best) return;
  await safeExecute(db.from('bank_accounts').update({
    balance: Number(best.balance_amount.amount), balance_type: best.balance_type, balance_synced_at: new Date().toISOString(),
  }).eq('id', account.id));
}

/** Najnowsze transakcje: od ostatniej znanej daty minus 7 dni (korekty ksiegowan), a przy pierwszym razie 90 dni. */
async function syncRecent(db: SupabaseClient, account: AccountRow): Promise<void> {
  const latest = await safeExecute(
    db.from('bank_transactions').select('booking_date').eq('account_id', account.id)
      .not('booking_date', 'is', null).order('booking_date', { ascending: false }).limit(1).maybeSingle(),
  );
  const from = latest?.booking_date ? shift(latest.booking_date, -7) : shift(day(new Date()), -RECENT_DAYS);
  await store(db, account, await fetchSince(account.account_uid, from));
}

/** Cala dostepna historia jednym przebiegiem. Blad banku zostawia konto niekompletne, wiec nastepny sync ponowi. */
async function backfill(db: SupabaseClient, account: AccountRow): Promise<void> {
  if (account.history_complete) return;
  const from = shift(day(new Date()), -HISTORY_DAYS);
  await store(db, account, await fetchSince(account.account_uid, from));
  await safeExecute(db.from('bank_accounts').update({ history_cursor: from, history_complete: true }).eq('id', account.id));
}

export async function syncUser(db: SupabaseClient, userId: string | null): Promise<Array<Record<string, unknown>>> {
  let q = db.from('bank_connections').select('id, user_id').eq('status', 'active');
  if (userId) q = q.eq('user_id', userId);
  const connections: Array<{ id: string; user_id: string }> = await safeExecute(q);
  const report: Array<Record<string, unknown>> = [];
  for (const c of connections) {
    try {
      const accounts: AccountRow[] = await safeExecute(
        db.from('bank_accounts').select('id, user_id, account_uid, history_complete').eq('connection_id', c.id),
      );
      for (const a of accounts) {
        await syncBalance(db, a);
        await syncRecent(db, a);
        await backfill(db, a);
      }
      await safeExecute(db.from('bank_connections').update({
        last_synced_at: new Date().toISOString(), last_error: null, updated_at: new Date().toISOString(),
      }).eq('id', c.id));
      report.push({ connection: c.id, accounts: accounts.length, ok: true });
    } catch (err) {
      const expired = err instanceof EbError && (err.status === 401 || err.status === 403);
      await safeExecute(db.from('bank_connections').update({
        status: expired ? 'expired' : 'active', last_error: err instanceof Error ? err.message.slice(0, 300) : 'sync error',
        updated_at: new Date().toISOString(),
      }).eq('id', c.id));
      report.push({ connection: c.id, ok: false, expired });
    }
  }
  return report;
}
