import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { invokeEdge, supabase } from '../supabase';
import { financeKeys } from '../queryKeys';
import { unwrapList, unwrapMaybe } from '../supabaseUtils';
import { detectRecurring, type RecurringPayment } from '@vanguard/domain';
import { getTodayWarsaw, shiftDateStr } from '../date';
import type { BankConnectionStatus } from './bankStatus';
import { summarizeSpending, type CategorySpending } from './bankSpending';

interface BankConnection {
  id: string;
  aspsp_name: string;
  status: BankConnectionStatus;
  valid_until: string | null;
  last_synced_at: string | null;
  last_error: string | null;
  last_note: string | null;
}

export interface BankAccount {
  id: string;
  iban: string | null;
  name: string | null;
  currency: string | null;
  balance: number | null;
  balance_synced_at: string | null;
}

export interface BankTransaction {
  id: string;
  account_id: string;
  amount: number;
  currency: string;
  booking_date: string | null;
  counterparty_name: string | null;
  remittance: string | null;
  category: string | null;
}

export interface BankData {
  connection: BankConnection | null;
  accounts: BankAccount[];
  transactions: BankTransaction[];
  transactionCount: number;
  /** Wydatki bieżącego miesiąca po kategorii (bez przelewów własnych). */
  monthSpending: CategorySpending[];
  /** Transakcje, których reguły nie rozpoznały — czekają na ręczne przypisanie (największe pierwsze). */
  review: BankTransaction[];
  reviewCount: number;
  /** Wydatki, które wracają regularnie (subskrypcje, abonamenty). */
  recurring: RecurringPayment[];
}

const RECENT_LIMIT = 15;
const REVIEW_LIMIT = 8;
const RECURRING_LOOKBACK_DAYS = 400;
const NEEDS_REVIEW = 'category.is.null,category.eq.do_sprawdzenia';
const TX_COLUMNS = 'id, account_id, amount, currency, booking_date, counterparty_name, remittance, category';

async function fetchBankData(userId: string): Promise<BankData> {
  const monthStart = `${getTodayWarsaw().slice(0, 7)}-01`;
  const historyStart = shiftDateStr(getTodayWarsaw(), -RECURRING_LOOKBACK_DAYS);
  const [connectionRes, accountsRes, transactionsRes, countRes, monthRes, reviewRes, reviewCountRes, historyRes] = await Promise.all([
    supabase.from('bank_connections')
      .select('id, aspsp_name, status, valid_until, last_synced_at, last_error, last_note')
      .eq('user_id', userId).in('status', ['active', 'expired'])
      .order('created_at', { ascending: false }).limit(1).maybeSingle(),
    supabase.from('bank_accounts')
      .select('id, iban, name, currency, balance, balance_synced_at')
      .eq('user_id', userId).eq('hidden', false).order('created_at'),
    supabase.from('bank_transactions')
      .select(TX_COLUMNS)
      .eq('user_id', userId).order('booking_date', { ascending: false }).order('created_at', { ascending: false }).limit(RECENT_LIMIT),
    supabase.from('bank_transactions').select('id', { count: 'exact', head: true }).eq('user_id', userId),
    supabase.from('bank_transactions').select('amount, category')
      .eq('user_id', userId).lt('amount', 0).gte('booking_date', monthStart).limit(1000),
    supabase.from('bank_transactions').select(TX_COLUMNS).eq('user_id', userId).or(NEEDS_REVIEW)
      .order('amount', { ascending: true }).limit(REVIEW_LIMIT),
    supabase.from('bank_transactions').select('id', { count: 'exact', head: true }).eq('user_id', userId).or(NEEDS_REVIEW),
    supabase.from('bank_transactions').select('counterparty_name, amount, booking_date')
      .eq('user_id', userId).lt('amount', 0).gte('booking_date', historyStart).limit(1000),
  ]);
  if (countRes.error) throw new Error(countRes.error.message);
  if (reviewCountRes.error) throw new Error(reviewCountRes.error.message);
  return {
    connection: unwrapMaybe(connectionRes) as BankConnection | null,
    accounts: unwrapList(accountsRes) as BankAccount[],
    transactions: unwrapList(transactionsRes) as BankTransaction[],
    transactionCount: countRes.count ?? 0,
    monthSpending: summarizeSpending(unwrapList(monthRes)),
    review: unwrapList(reviewRes) as BankTransaction[],
    reviewCount: reviewCountRes.count ?? 0,
    recurring: detectRecurring(unwrapList(historyRes).flatMap((r) => (r.booking_date
      ? [{ counterparty: r.counterparty_name, amount: Number(r.amount), date: r.booking_date }]
      : []))),
  };
}

export function useBankData(userId: string | undefined) {
  return useQuery({
    queryKey: financeKeys.bank(userId ?? ''),
    queryFn: () => fetchBankData(userId!),
    enabled: !!userId,
  });
}

/** Start zgody (przekierowanie do banku) i synchronizacja. Odczyt tylko przez edge function bank-sync. */
export function useBankActions(userId: string | undefined) {
  const queryClient = useQueryClient();
  const refresh = () => queryClient.invalidateQueries({ queryKey: financeKeys.bank(userId ?? '') });

  const connect = useMutation({
    mutationFn: async () => {
      const res = await invokeEdge('bank-sync', { body: { action: 'start' } });
      if (typeof res.url !== 'string') throw new Error('Bank nie zwrócił adresu zgody');
      return res.url;
    },
    onSuccess: (url) => { window.location.assign(url); },
  });

  const sync = useMutation({
    mutationFn: async () => { await invokeEdge('bank-sync', { body: { action: 'sync' } }); },
    onSettled: refresh,
  });

  const assignCategory = useMutation({
    mutationFn: async (input: { transactionId: string; category: string; remember: boolean }) => {
      await invokeEdge('bank-sync', { body: { action: 'set_category', ...input } });
    },
    onSettled: refresh,
  });

  return { connect, sync, assignCategory };
}
