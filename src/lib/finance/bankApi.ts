import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { invokeEdge, supabase } from '../supabase';
import { financeKeys } from '../queryKeys';
import { unwrapList, unwrapMaybe } from '../supabaseUtils';
import type { BankConnectionStatus } from './bankStatus';

interface BankConnection {
  id: string;
  aspsp_name: string;
  status: BankConnectionStatus;
  valid_until: string | null;
  last_synced_at: string | null;
  last_error: string | null;
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
}

export interface BankData {
  connection: BankConnection | null;
  accounts: BankAccount[];
  transactions: BankTransaction[];
  transactionCount: number;
}

const RECENT_LIMIT = 15;

async function fetchBankData(userId: string): Promise<BankData> {
  const [connectionRes, accountsRes, transactionsRes, countRes] = await Promise.all([
    supabase.from('bank_connections')
      .select('id, aspsp_name, status, valid_until, last_synced_at, last_error')
      .eq('user_id', userId).in('status', ['active', 'expired'])
      .order('created_at', { ascending: false }).limit(1).maybeSingle(),
    supabase.from('bank_accounts')
      .select('id, iban, name, currency, balance, balance_synced_at')
      .eq('user_id', userId).order('created_at'),
    supabase.from('bank_transactions')
      .select('id, account_id, amount, currency, booking_date, counterparty_name, remittance')
      .eq('user_id', userId).order('booking_date', { ascending: false }).order('created_at', { ascending: false }).limit(RECENT_LIMIT),
    supabase.from('bank_transactions').select('id', { count: 'exact', head: true }).eq('user_id', userId),
  ]);
  if (countRes.error) throw new Error(countRes.error.message);
  return {
    connection: unwrapMaybe(connectionRes) as BankConnection | null,
    accounts: unwrapList(accountsRes) as BankAccount[],
    transactions: unwrapList(transactionsRes) as BankTransaction[],
    transactionCount: countRes.count ?? 0,
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

  return { connect, sync };
}
