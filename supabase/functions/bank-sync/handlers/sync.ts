import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';
import {
  BANK_CATEGORY_LABELS, bankCounterpartyKey, categorizeBankTransaction, type BankCategory,
} from '@vanguard/domain';
import { HttpError } from '../../_shared/http.ts';
import { safeExecute } from '../../_shared/supabase.ts';
import {
  type BankTransactionRow, EbError, ebBalances, ebTransactions, isBankReadLimit, mapTransaction,
} from '../../_shared/enableBanking.ts';

const RECENT_DAYS = 90;
// Pekao oddaje ok. 4 lat historii przy jednym date_from; okna z date_to bank odrzuca (ASPSP_ERROR).
const HISTORY_DAYS = 1400;
const MAX_PAGES = 150;
const UPSERT_CHUNK = 500;
// Pelna historia to dziesiatki odczytow, a bank limituje je bez obecnosci uzytkownika — probujemy raz na dobe.
const BACKFILL_COOLDOWN_MS = 24 * 3600e3;
// Przycisk "Synchronizuj teraz" nie moze wypalac limitu przy kazdym kliknieciu.
const MANUAL_COOLDOWN_MS = 15 * 60e3;
const LIMIT_NOTE = 'Bank chwilowo ogranicza odczyt (limit PSD2). Dane są z ostatniej udanej synchronizacji, spróbuję ponownie później.';
const HISTORY_NOTE = 'Starsza historia (sprzed 90 dni) zostanie pobrana, gdy bank zwolni limit odczytów.';

interface AccountRow {
  id: string; user_id: string; account_uid: string; name: string | null;
  history_complete: boolean; history_attempted_at: string | null; hidden: boolean;
}

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

/**
 * Cala dostepna historia jednym przebiegiem, najwyzej raz na dobe. Zwraca true, gdy historia jest kompletna.
 * Limit banku zostawia konto niekompletne bez bledu — nastepna proba po okresie karencji.
 */
async function backfill(db: SupabaseClient, account: AccountRow): Promise<boolean> {
  if (account.history_complete) return true;
  const attempted = account.history_attempted_at ? Date.parse(account.history_attempted_at) : 0;
  if (Date.now() - attempted < BACKFILL_COOLDOWN_MS) return false;
  await safeExecute(db.from('bank_accounts').update({ history_attempted_at: new Date().toISOString() }).eq('id', account.id));
  const from = shift(day(new Date()), -HISTORY_DAYS);
  try {
    await store(db, account, await fetchSince(account.account_uid, from));
  } catch (err) {
    if (isBankReadLimit(err)) return false;
    throw err;
  }
  await safeExecute(db.from('bank_accounts').update({ history_cursor: from, history_complete: true }).eq('id', account.id));
  return true;
}

/**
 * Nadaje kategorie transakcjom regulami z domeny. `all = false` dotyka tylko nowych (bez kategorii),
 * `all = true` przelicza wszystko poza kategoriami ustawionymi recznie.
 */
async function categorizeUser(
  db: SupabaseClient, userId: string, ownNames: string[], all: boolean,
): Promise<{ updated: number }> {
  const byCategory = new Map<BankCategory, string[]>();
  const ruleRows: Array<{ counterparty_key: string; category: string }> = await safeExecute(
    db.from('bank_category_rules').select('counterparty_key, category').eq('user_id', userId),
  );
  const userRules = new Map<string, BankCategory>(
    ruleRows.filter((r) => r.category in BANK_CATEGORY_LABELS).map((r) => [r.counterparty_key, r.category as BankCategory]),
  );
  for (let from = 0; ; from += 1000) {
    let q = db.from('bank_transactions').select('id, counterparty_name, remittance, direction')
      .eq('user_id', userId).neq('category_source', 'manual').order('id').range(from, from + 999);
    if (!all) q = q.is('category', null);
    const rows: Array<{ id: string; counterparty_name: string | null; remittance: string | null; direction: 'debit' | 'credit' }> =
      await safeExecute(q);
    for (const r of rows) {
      const category = categorizeBankTransaction(
        { counterparty: r.counterparty_name, remittance: r.remittance, direction: r.direction }, ownNames, userRules,
      );
      byCategory.set(category, [...(byCategory.get(category) ?? []), r.id]);
    }
    if (rows.length < 1000) break;
  }
  let updated = 0;
  for (const [category, ids] of byCategory) {
    for (let i = 0; i < ids.length; i += 200) {
      const chunk = ids.slice(i, i + 200);
      await safeExecute(db.from('bank_transactions').update({ category, category_source: 'rule' }).in('id', chunk));
      updated += chunk.length;
    }
  }
  return { updated };
}

const ownNamesOf = (accounts: AccountRow[]): string[] => [...new Set(accounts.map((a) => a.name).filter((n): n is string => !!n))];

async function loadAccounts(db: SupabaseClient, connectionId: string): Promise<AccountRow[]> {
  return await safeExecute(
    db.from('bank_accounts')
      .select('id, user_id, account_uid, name, history_complete, history_attempted_at, hidden')
      .eq('connection_id', connectionId),
  );
}

/**
 * Reczny wybor uzytkownika dla transakcji, ktorej reguly nie rozpoznaly. Z `remember` zapamietuje wybor
 * dla kontrahenta i przelicza pozostale (nieustawione recznie) transakcje tego kontrahenta.
 */
export async function setCategory(
  db: SupabaseClient, userId: string | null, input: { transactionId?: unknown; category?: unknown; remember?: unknown },
): Promise<Record<string, unknown>> {
  if (!userId) throw new HttpError(400, 'Brak userId');
  const category = typeof input.category === 'string' ? input.category : '';
  if (!(category in BANK_CATEGORY_LABELS) || category === 'do_sprawdzenia') throw new HttpError(400, 'Nieznana kategoria');
  const transactionId = typeof input.transactionId === 'string' ? input.transactionId : '';
  const tx = await safeExecute(
    db.from('bank_transactions').select('id, counterparty_name').eq('id', transactionId).eq('user_id', userId).maybeSingle(),
  );
  if (!tx) throw new HttpError(404, 'Nie znaleziono transakcji');
  await safeExecute(db.from('bank_transactions').update({ category, category_source: 'manual' }).eq('id', tx.id));
  const key = bankCounterpartyKey(tx.counterparty_name);
  if (input.remember === true && key) {
    await safeExecute(db.from('bank_category_rules').upsert({ user_id: userId, counterparty_key: key, category }, { onConflict: 'user_id,counterparty_key' }));
    return { remembered: true, ...(await recategorize(db, userId)) };
  }
  return { remembered: false };
}

export async function recategorize(db: SupabaseClient, userId: string | null): Promise<Record<string, unknown>> {
  if (!userId) return { updated: 0 };
  const accounts: AccountRow[] = await safeExecute(
    db.from('bank_accounts')
      .select('id, user_id, account_uid, name, history_complete, history_attempted_at, hidden').eq('user_id', userId),
  );
  return await categorizeUser(db, userId, ownNamesOf(accounts), true);
}

/** @param manual wywolanie z aplikacji (przycisk) — podlega karencji, cron jej nie ma. */
export async function syncUser(
  db: SupabaseClient, userId: string | null, manual = false,
): Promise<Array<Record<string, unknown>>> {
  let q = db.from('bank_connections').select('id, user_id, last_synced_at').eq('status', 'active');
  if (userId) q = q.eq('user_id', userId);
  const connections: Array<{ id: string; user_id: string; last_synced_at: string | null }> = await safeExecute(q);
  const report: Array<Record<string, unknown>> = [];
  for (const c of connections) {
    if (manual && c.last_synced_at && Date.now() - Date.parse(c.last_synced_at) < MANUAL_COOLDOWN_MS) {
      report.push({ connection: c.id, ok: true, skipped: 'cooldown' });
      continue;
    }
    try {
      const accounts = await loadAccounts(db, c.id);
      let limited = false;
      let historyPending = false;
      // Ukryte rachunki nie sa synchronizowane — oszczedzamy limit odczytow banku.
      for (const a of accounts.filter((x) => !x.hidden)) {
        try {
          await syncBalance(db, a);
          await syncRecent(db, a);
        } catch (err) {
          if (!isBankReadLimit(err)) throw err;
          limited = true;
          break; // kolejne odczyty tylko pogorsza limit
        }
        if (!(await backfill(db, a))) historyPending = true;
      }
      await categorizeUser(db, c.user_id, ownNamesOf(accounts), false);
      const note = limited ? LIMIT_NOTE : historyPending ? HISTORY_NOTE : null;
      await safeExecute(db.from('bank_connections').update({
        ...(limited ? {} : { last_synced_at: new Date().toISOString() }),
        last_error: null, last_note: note, updated_at: new Date().toISOString(),
      }).eq('id', c.id));
      report.push({ connection: c.id, accounts: accounts.length, ok: true, limited, historyPending });
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
