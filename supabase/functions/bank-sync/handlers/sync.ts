import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';
import {
  getTodayWarsaw, historyCursor, historyFloor, isHistoryExhausted, nextHistoryWindow, shiftDateStr,
} from '@vanguard/domain';
import { safeExecute } from '../../_shared/supabase.ts';
import { type BankTransactionRow, EbError, ebBalances, ebTransactions, isBankReadLimit, mapTransaction } from '../../_shared/enableBanking.ts';
import { categorizeUser } from './categories.ts';

const RECENT_DAYS = 90;
const MAX_PAGES = 150;
const MANUAL_COOLDOWN_MS = 15 * 60e3;
/** Okna historii na jedno uruchomienie: cron 3x dziennie bierze po jednym oknie, reczna synchronizacja (uzytkownik obecny) wiecej. */
const AUTO_HISTORY_WINDOWS = 1;
const MANUAL_HISTORY_WINDOWS = 12;
/**
 * Pobieranie starszej historii z banku jest domyślnie wyłączone (limity PSD2 Pekao); historię dowozi import CSV.
 * Włączenie: sekret funkcji BANK_HISTORY_BACKFILL=on.
 */
const HISTORY_BACKFILL_ENABLED = Deno.env.get('BANK_HISTORY_BACKFILL') === 'on';
const LIMIT_NOTE ='Bank ogranicza odczyt. Pokazuję ostatnio pobrane dane; spróbuję ponownie później.';
const HISTORY_PENDING_NOTE = 'Starsza historia nie została jeszcze w całości pobrana.';

interface AccountRow {
  id: string; user_id: string; account_uid: string; history_complete: boolean; history_cursor: string | null;
  history_attempted_at: string | null; hidden: boolean; transactions_from: string | null;
}

function mapPage(rows: Array<ReturnType<typeof mapTransaction>>): BankTransactionRow[] {
  return rows.map((row) => {
    if (!row) throw new Error('Bank zwrócił transakcję bez identyfikatora lub poprawnej kwoty');
    return row;
  });
}

async function fetchSince(accountUid: string, from: string): Promise<BankTransactionRow[]> {
  const rows: BankTransactionRow[] = [];
  let key: string | null | undefined;
  for (let page = 0; page < MAX_PAGES; page++) {
    const res = await ebTransactions(accountUid, from, key);
    rows.push(...mapPage((res.transactions ?? []).map(mapTransaction)));
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

/** Pobiera jedno okno [from, to]; każda strona trafia do bazy od razu (limit w połowie okna nie kasuje postępu). */
async function fetchWindow(db: SupabaseClient, account: AccountRow, from: string, to: string): Promise<number> {
  let key: string | null | undefined;
  let count = 0;
  for (let page = 0; page < MAX_PAGES; page++) {
    const res = await ebTransactions(account.account_uid, from, key, to);
    const rows = mapPage((res.transactions ?? []).map(mapTransaction));
    await store(db, account, rows);
    count += rows.length;
    key = res.continuation_key;
    if (!key) return count;
  }
  throw new Error('Okno historii przekroczyło limit stron. Nie można potwierdzić kompletności.');
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

async function oldestStoredDate(db: SupabaseClient, accountId: string): Promise<string | null> {
  const row = await safeExecute(db.from('bank_transactions').select('booking_date').eq('account_id', accountId)
    .not('booking_date', 'is', null).order('booking_date', { ascending: true }).limit(1).maybeSingle());
  return row?.booking_date ?? null;
}

/**
 * Starsza historia oknami wstecz od kursora. Po każdym zapisanym oknie kursor przesuwa się, więc limit odczytów
 * (rzucany wyżej jako błąd) zatrzymuje pobieranie bez utraty postępu. Zwraca true, gdy historia jest kompletna.
 */
async function backfill(db: SupabaseClient, account: AccountRow, maxWindows: number): Promise<boolean> {
  if (account.history_complete) return true;
  const today = getTodayWarsaw();
  const floor = historyFloor(today);
  let oldest = await oldestStoredDate(db, account.id);
  let cursor = historyCursor({ historyCursor: account.history_cursor, transactionsFrom: account.transactions_from,
    oldestStored: oldest }, today, RECENT_DAYS);
  await safeExecute(db.from('bank_accounts').update({ history_attempted_at: new Date().toISOString() }).eq('id', account.id));

  for (let i = 0; i <= maxWindows; i++) {
    const window = nextHistoryWindow(cursor, floor);
    if (!window || isHistoryExhausted(cursor, oldest)) {
      await safeExecute(db.from('bank_accounts').update({ history_cursor: cursor, history_complete: true,
        transactions_from: cursor, transactions_synced_at: new Date().toISOString() }).eq('id', account.id));
      return true;
    }
    if (i === maxWindows) break;
    await fetchWindow(db, account, window.from, window.to);
    cursor = window.from;
    oldest = await oldestStoredDate(db, account.id);
    await safeExecute(db.from('bank_accounts').update({ history_cursor: cursor,
      transactions_from: account.transactions_from && account.transactions_from < cursor ? account.transactions_from : cursor,
      transactions_synced_at: new Date().toISOString() }).eq('id', account.id));
  }
  return false;
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
        .select('id, user_id, account_uid, history_complete, history_cursor, history_attempted_at, hidden, transactions_from')
        .eq('connection_id', c.id).eq('hidden', false));
      let limited = false;
      let historyPending = false;
      let historyNote: string | null = null;
      for (const a of accounts) {
        try {
          await syncBalance(db, a);
          await syncRecent(db, a);
          if (!HISTORY_BACKFILL_ENABLED) continue; // starsza historia z importu CSV, nie z odczytów banku
          try {
            if (!(await backfill(db, a, manual ? MANUAL_HISTORY_WINDOWS : AUTO_HISTORY_WINDOWS))) historyPending = true;
          } catch (historyErr) {
            // Błąd starszej historii nie może blokować zwykłej synchronizacji sald i świeżych transakcji.
            if (isBankReadLimit(historyErr)) throw historyErr;
            historyPending = true;
            historyNote = `Starsza historia chwilowo niedostępna (${historyErr instanceof Error ? historyErr.message.slice(0, 120) : 'błąd banku'}).`;
          }
        } catch (err) {
          if (!isBankReadLimit(err)) throw err;
          limited = true;
          historyPending ||= HISTORY_BACKFILL_ENABLED && !a.history_complete;
          break;
        }
      }
      await categorizeUser(db, c.user_id, true);
      const note = limited ? LIMIT_NOTE : historyNote ?? (historyPending ? HISTORY_PENDING_NOTE : null);
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
