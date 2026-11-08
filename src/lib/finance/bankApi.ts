import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { invokeEdge, supabase } from '../supabase';
import { financeKeys } from '../queryKeys';
import { unwrapList, unwrapMaybe } from '../supabaseUtils';
import type { BankConnectionStatus } from './bankStatus';

interface BankConnection {
  id: string; aspsp_name: string; status: BankConnectionStatus; valid_until: string | null;
  last_synced_at: string | null; last_error: string | null; last_note: string | null;
}
export interface BankAccount {
  id: string; iban: string | null; name: string | null; currency: string | null;
  balance: number | null; balance_synced_at: string | null; balance_type?: string | null;
  history_complete?: boolean; history_cursor?: string | null;
  transactions_synced_at?: string | null; transactions_from?: string | null;
  hidden?: boolean;
}
export interface BankTransaction {
  id: string; account_id: string; amount: number; currency: string; booking_date: string | null;
  counterparty_name: string | null; counterparty_iban?: string | null; remittance: string | null; category: string | null;
  category_source?: string; status?: string | null;
}
export interface BankData {
  connection: BankConnection | null;
  accounts: BankAccount[];
  hiddenAccounts?: BankAccount[];
  transactions: BankTransaction[];
  transactionCount: number;
}
export interface BankCategoryAssignment { transactionId: string; category: string | null; remember: boolean; forgetRule?: boolean }

const TX_COLUMNS = 'id, account_id, amount, currency, booking_date, counterparty_name, counterparty_iban, remittance, category, category_source, status:raw->>status';

async function fetchBankData(userId: string): Promise<BankData> {
  const [connectionRes, accountsRes] = await Promise.all([
    supabase.from('bank_connections').select('id, aspsp_name, status, valid_until, last_synced_at, last_error, last_note')
      .eq('user_id', userId).in('status', ['active', 'expired']).order('created_at', { ascending: false }).limit(1).maybeSingle(),
    supabase.from('bank_accounts')
      .select('id, iban, name, currency, balance, balance_type, balance_synced_at, history_complete, history_cursor, transactions_synced_at, transactions_from, hidden')
      .eq('user_id', userId).order('created_at'),
  ]);
  const allAccounts = unwrapList(accountsRes);
  const accounts = allAccounts.filter(a => !a.hidden);
  const hiddenAccounts = allAccounts.filter(a => !!a.hidden);
  const transactions: BankTransaction[] = [];
  const cutoff = new Date().toISOString();
  if (accounts.length) {
    for (let from = 0; ;) {
      const res = await supabase.from('bank_transactions').select(TX_COLUMNS, { count: 'exact' })
        .eq('user_id', userId).in('account_id', accounts.map(a => a.id)).lte('created_at', cutoff)
        .order('id').range(from, from + 499);
      const rows = unwrapList(res);
      if (res.count == null) throw new Error('Nie można potwierdzić kompletności historii bankowej');
      transactions.push(...rows.map(row => ({ ...row, status: row.status ?? 'OTHR' })));
      from += rows.length;
      if (from >= res.count) break;
      if (!rows.length) throw new Error('Historia bankowa jest niepełna. Spróbuj ponownie.');
    }
  }
  return { connection: unwrapMaybe(connectionRes) as BankConnection | null, accounts,
    hiddenAccounts, transactions, transactionCount: transactions.length };
}

export function useBankData(userId: string | undefined) {
  return useQuery({ queryKey: financeKeys.bank(userId ?? ''), queryFn: () => fetchBankData(userId!), enabled: !!userId,
    staleTime: 60_000, refetchOnWindowFocus: 'always', refetchInterval: 5 * 60_000 });
}

interface SyncResult { ok: boolean; limited?: boolean; historyPending?: boolean; skipped?: string; message?: string }

export function useBankActions(userId: string | undefined) {
  const queryClient = useQueryClient();
  const refresh = async () => {
    await Promise.all([queryClient.invalidateQueries({ queryKey: financeKeys.bank(userId ?? '') }),
      queryClient.invalidateQueries({ queryKey: financeKeys.bundle(userId ?? '') })]);
  };
  const connect = useMutation({ mutationFn: async () => {
    const res = await invokeEdge('bank-sync', { body: { action: 'start' } });
    if (typeof res.url !== 'string') throw new Error('Bank nie zwrócił adresu zgody');
    return res.url;
  }, onSuccess: url => { window.location.assign(url); } });

  const sync = useMutation({ mutationFn: async () => {
    const res = await invokeEdge('bank-sync', { body: { action: 'sync' } });
    const results: SyncResult[] = Array.isArray(res.results) ? res.results.filter((r: unknown): r is SyncResult =>
      !!r && typeof r === 'object' && 'ok' in r && typeof r.ok === 'boolean') : [];
    if (!results?.length) throw new Error('Brak aktywnego połączenia z bankiem');
    const failed = results.find(r => !r.ok);
    if (failed) throw new Error(failed.message ?? 'Synchronizacja się nie powiodła');
    if (results.some(r => r.skipped === 'cooldown')) return 'Dane były niedawno pobierane. Kolejna próba jest dostępna po 15 minutach.';
    if (results.some(r => r.limited)) return 'Bank ogranicza odczyty. Pokazuję ostatnio pobrane dane.';
    return results.some(r => r.historyPending) ? 'Bieżące dane pobrane. Starsza historia jest jeszcze niepełna.' : 'Dane bankowe zaktualizowane.';
  }, onSettled: refresh });

  const assignCategory = useMutation({ mutationFn: async (input: BankCategoryAssignment) => {
    await invokeEdge('bank-sync', { body: { action: 'set_category', ...input } });
  }, onSettled: refresh });

  const toggleVisibility = useMutation({
    mutationFn: async ({ accountId, hidden }: { accountId: string; hidden: boolean }) => {
      const res = await supabase.rpc('set_bank_account_visibility', {
        p_account_id: accountId,
        p_hidden: hidden,
      });
      if (res.error) throw res.error;
    },
    onSettled: refresh,
  });

  return { connect, sync, assignCategory, toggleVisibility };
}
