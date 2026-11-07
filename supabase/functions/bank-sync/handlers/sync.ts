import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { getTodayWarsaw, shiftDateStr } from '@vanguard/domain';
import { safeExecute } from '../../_shared/supabase.ts';
import { type BankTransactionRow, EbError, ebBalances, ebTransactions, isBankReadLimit, mapTransaction } from '../../_shared/enableBanking.ts';
import { categorizeUser } from './categories.ts';

const RECENT_DAYS = 90;
const HISTORY_DAYS = 1400;
const MAX_PAGES = 150;
const BACKFILL_COOLDOWN_MS = 24 * 3600e3;
const MANUAL_COOLDOWN_MS = 15 * 60e3;
const LIMIT_NOTE = 'Bank ogranicza odczyt. Pokazuję ostatnio pobrane dane; spróbuję ponownie później.';

interface AccountRow {
  id: string; user_id: string; account_uid: string; history_complete: boolean;
  history_attempted_at: string | null; hidden: boolean; transactions_from: string | null;
}

async function fetchSince(accountUid: string, from: string): Promise<BankTransactionRow[]> {
  const rows: BankTransactionRow[] = [];
  let key: string | null | undefined;
  for (let page = 0; page < MAX_PAGES; page++) {
    const res = await ebTransactions(accountUid, from, key);
    for (const t of res.transactions ?? []) {
      const row = mapTransaction(t);
      if (!row) throw new Error('Bank zwrócił transakcję bez identyfikatora lub poprawnej kwoty');
      rows.push(row);
    }
    key = res.continuation_key;
    if (!key) return rows;
  }
  throw new Error('Historia przekroczyła limit stron. Nie można potwierdzić kompletności.');
}

async function store(db: SupabaseClient, account: AccountRow, rows: BankTransactionRow[]): Promise<void> {
  for (let i = 0; i < rows.length; i += 500) {
    const chunk = rows.slice(i, i + 500).map(r => ({ ...r, user_id: account.user_id, account_id: account.id }));
    await safeExecute(db.from('bank_transactions').upsert(chunk, { onConflict: 'account_id,transaction_id' }));
  }
}

async function syncBalance(db: SupabaseClient, account: AccountRow): Promise<void> {
  const { balances } = await ebBalances(account.account_uid);
  const best = balances?.find(b => b.balance_type === 'ITBD') ?? balances?.[0];
  if (!best) throw new Error('Bank nie przekazał salda rachunku');
  const balance = Number(best.balance_amount.amount);
  if (!Number.isFinite(balance)) throw new Error('Niepoprawne saldo bankowe');
  await safeExecute(db.from('bank_accounts').update({ balance, balance_type: best.balance_type,
    balance_synced_at: new Date().toISOString() }).eq('id', account.id));
}

async function syncRecent(db: SupabaseClient, account: AccountRow): Promise<void> {
  const latest = await safeExecute(db.from('bank_transactions').select('booking_date').eq('account_id', account.id)
    .not('booking_date', 'is', null).order('booking_date', { ascending: false }).limit(1).maybeSingle());
  const from = latest?.booking_date ? shiftDateStr(latest.booking_date, -7) : shiftDateStr(getTodayWarsaw(), -RECENT_DAYS);
  await store(db, account, await fetchSince(account.account_uid, from));
  await safeExecute(db.from('bank_accounts').update({ transactions_synced_at: new Date().toISOString(),
    transactions_from: account.transactions_from && account.transactions_from < from ? account.transactions_from : from,
  }).eq('id', account.id));
}

async function backfill(db: SupabaseClient, account: AccountRow): Promise<boolean> {
  if (account.history_complete) return true;
  if (account.history_attempted_at && Date.now() - Date.parse(account.history_attempted_at) < BACKFILL_COOLDOWN_MS) return false;
  await safeExecute(db.from('bank_accounts').update({ history_attempted_at: new Date().toISOString() }).eq('id', account.id));
  const from = shiftDateStr(getTodayWarsaw(), -HISTORY_DAYS);
  await store(db, account, await fetchSince(account.account_uid, from));
  await safeExecute(db.from('bank_accounts').update({ history_cursor: from, history_complete: true,
    transactions_from: from, transactions_synced_at: new Date().toISOString() }).eq('id', account.id));
  return true;
}

export async function syncUser(db: SupabaseClient, userId: string | null, manual = false): Promise<Array<Record<string, unknown>>> {
  let q = db.from('bank_connections').select('id, user_id, last_synced_at').eq('status', 'active');
  if (userId) q = q.eq('user_id', userId);
  const connections: Array<{ id: string; user_id: string; last_synced_at: string | null }> = await safeExecute(q);
  const report: Array<Record<string, unknown>> = [];
  for (const c of connections) {
    if (manual && c.last_synced_at && Date.now() - Date.parse(c.last_synced_at) < MANUAL_COOLDOWN_MS) {
      report.push({ ok: true, skipped: 'cooldown' });
      continue;
    }
    try {
      const accounts: AccountRow[] = await safeExecute(db.from('bank_accounts')
        .select('id, user_id, account_uid, history_complete, history_attempted_at, hidden, transactions_from').eq('connection_id', c.id).eq('hidden', false));
      let limited = false;
      let historyPending = false;
      for (const a of accounts) {
        try {
          await syncBalance(db, a);
          await syncRecent(db, a);
          if (!(await backfill(db, a))) historyPending = true;
        } catch (err) {
          if (!isBankReadLimit(err)) throw err;
          limited = true;
          historyPending ||= !a.history_complete;
          break;
        }
      }
      await categorizeUser(db, c.user_id, true);
      const note = limited ? LIMIT_NOTE : historyPending ? 'Starsza historia nie została jeszcze w całości pobrana.' : null;
      await safeExecute(db.from('bank_connections').update({ ...(limited ? {} : { last_synced_at: new Date().toISOString() }),
        last_error: null, last_note: note, updated_at: new Date().toISOString() }).eq('id', c.id));
      report.push({ ok: true, limited, historyPending });
    } catch (err) {
      const expired = err instanceof EbError && (err.status === 401 || err.status === 403);
      const message = err instanceof Error ? err.message.slice(0, 300) : 'Błąd synchronizacji';
      await safeExecute(db.from('bank_connections').update({ status: expired ? 'expired' : 'active', last_error: message,
        updated_at: new Date().toISOString() }).eq('id', c.id));
      report.push({ ok: false, expired, message });
    }
  }
  return report;
}
