import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from './supabase';
import { financeKeys } from './queryKeys';
import { getTodayWarsaw } from './date';

export interface FinanceProfile {
  user_id: string;
  monthly_expenses: number;
  monthly_income: number;
  expected_return_pct: number;
  inflation_pct: number;
  safe_withdrawal_rate_pct: number;
  emergency_target_months: number;
  years_to_retirement: number;
  net_worth_target: number;
  updated_at: string;
}

export interface FinanceAccount {
  id: string;
  user_id: string;
  name: string;
  balance: number;
  account_type: string;
  is_liquid: boolean;
  sort_order: number;
  coingecko_id: string | null;
  crypto_amount: number | null;
  created_at: string;
}

interface FinanceGoal {
  id: string;
  user_id: string;
  name: string;
  target_amount: number;
  current_amount: number;
  priority: number;
  deadline: string | null;
  auto_save_monthly: number;
  created_at: string;
}

export interface FinanceWishlistItem {
  id: string;
  user_id: string;
  name: string;
  price: number;
  value_score: number;
  is_impulse: boolean;
  cool_off_until: string | null;
  still_want: boolean;
  notes: string | null;
  created_at: string;
}

export interface FinanceSubscription {
  id: string;
  user_id: string;
  name: string;
  amount_monthly: number;
  renewal_date: string | null;
  is_active: boolean;
  is_unused: boolean;
  created_at: string;
}

export interface FinanceBill {
  id: string;
  user_id: string;
  name: string;
  amount: number;
  due_day: number;
  reminder_days: number;
  is_active: boolean;
  created_at: string;
}

export interface FinanceTransaction {
  id: string;
  user_id: string;
  amount: number;
  category: string;
  note: string | null;
  transaction_date: string;
  kind: 'expense' | 'income';
  account_id?: string | null;
  created_at: string;
}

export interface FinanceIncomeSource {
  id: string;
  user_id: string;
  name: string;
  amount_monthly: number;
  source_type: string;
  is_active: boolean;
  created_at: string;
}

export interface FinanceSnapshot {
  id: string;
  user_id: string;
  snapshot_month: string;
  net_worth: number;
  liquid_cash: number;
  investments: number;
  debts: number;
  created_at: string;
}

export interface FinanceBundle {
  hasProfile: boolean;
  profile: FinanceProfile;
  accounts: FinanceAccount[];
  goals: FinanceGoal[];
  wishlist: FinanceWishlistItem[];
  subscriptions: FinanceSubscription[];
  bills: FinanceBill[];
  transactions: FinanceTransaction[];
  incomeSources: FinanceIncomeSource[];
  snapshots: FinanceSnapshot[];
}

const DEFAULT_PROFILE: Omit<FinanceProfile, 'user_id' | 'updated_at'> = {
  monthly_expenses: 0,
  monthly_income: 0,
  expected_return_pct: 7,
  inflation_pct: 3,
  safe_withdrawal_rate_pct: 4,
  emergency_target_months: 6,
  years_to_retirement: 20,
  net_worth_target: 100000,
};

function num(row: Record<string, unknown>, key: string): number {
  const v = row[key];
  return typeof v === 'number' ? v : Number(v ?? 0);
}

function mapProfile(row: Record<string, unknown>): FinanceProfile {
  return {
    user_id: String(row.user_id),
    monthly_expenses: num(row, 'monthly_expenses'),
    monthly_income: num(row, 'monthly_income'),
    expected_return_pct: num(row, 'expected_return_pct'),
    inflation_pct: num(row, 'inflation_pct'),
    safe_withdrawal_rate_pct: num(row, 'safe_withdrawal_rate_pct'),
    emergency_target_months: num(row, 'emergency_target_months'),
    years_to_retirement: num(row, 'years_to_retirement'),
    net_worth_target: num(row, 'net_worth_target') || DEFAULT_PROFILE.net_worth_target,
    updated_at: String(row.updated_at ?? ''),
  };
}

async function fetchFinanceTransactions(userId: string, monthKey: string): Promise<FinanceTransaction[]> {
  const { data: recent, error: recentError } = await supabase.from('finance_transactions')
    .select('*').eq('user_id', userId)
    .order('transaction_date', { ascending: false }).order('id', { ascending: false }).limit(50);
  if (recentError) throw new Error(recentError.message);
  const records = new Map((recent ?? []).map(row => [row.id, row as FinanceTransaction]));
  const [year, month] = monthKey.split('-').map(Number);
  const nextYear = month === 12 ? year + 1 : year;
  const nextMonthNum = month === 12 ? 1 : month + 1;
  const nextMonth = `${nextYear}-${String(nextMonthNum).padStart(2, '0')}-01`;
  let offset = 0;
  for (;;) {
    const { data, error, count } = await supabase.from('finance_transactions')
      .select('*', { count: 'exact' }).eq('user_id', userId)
      .gte('transaction_date', `${monthKey}-01`).lt('transaction_date', nextMonth)
      .order('transaction_date', { ascending: false }).order('id', { ascending: false })
      .range(offset, offset + 499);
    if (error) throw new Error(error.message);
    if (count == null) throw new Error('Nie można potwierdzić kompletności transakcji miesiąca');
    const page = data ?? [];
    for (const row of page) records.set(row.id, row as FinanceTransaction);
    offset += page.length;
    if (offset >= count) break;
    if (!page.length) throw new Error('Niepełne dane transakcji miesiąca');
  }
  return [...records.values()].sort((a, b) => b.transaction_date.localeCompare(a.transaction_date) || b.id.localeCompare(a.id));
}

async function fetchFinanceBundle(userId: string, monthKey: string): Promise<FinanceBundle> {
  const [
    profileRes,
    accountsRes,
    goalsRes,
    wishlistRes,
    subsRes,
    billsRes,
    txRes,
    incomeRes,
    snapshotsRes,
  ] = await Promise.all([
    supabase.from('finance_profile').select('*').eq('user_id', userId).maybeSingle(),
    supabase.from('finance_accounts').select('*').eq('user_id', userId).order('sort_order'),
    supabase.from('finance_goals').select('*').eq('user_id', userId).order('priority'),
    supabase.from('finance_wishlist').select('*').eq('user_id', userId).order('created_at', { ascending: false }),
    supabase.from('finance_subscriptions').select('*').eq('user_id', userId).order('name'),
    supabase.from('finance_bills').select('*').eq('user_id', userId).order('due_day'),
    fetchFinanceTransactions(userId, monthKey),
    supabase.from('finance_income_sources').select('*').eq('user_id', userId).order('name'),
    supabase.from('finance_snapshots').select('*').eq('user_id', userId).order('snapshot_month', { ascending: false }).limit(24),
  ]);

  for (const res of [profileRes, accountsRes, goalsRes, wishlistRes, subsRes, billsRes, incomeRes, snapshotsRes]) {
    if (res.error) throw new Error(res.error.message);
  }

  const profile = profileRes.data
    ? mapProfile(profileRes.data as Record<string, unknown>)
    : { user_id: userId, ...DEFAULT_PROFILE, updated_at: new Date().toISOString() };

  return {
    hasProfile: profileRes.data != null,
    profile,
    accounts: (accountsRes.data ?? []) as FinanceAccount[],
    goals: (goalsRes.data ?? []) as FinanceGoal[],
    wishlist: (wishlistRes.data ?? []) as FinanceWishlistItem[],
    subscriptions: (subsRes.data ?? []) as FinanceSubscription[],
    bills: (billsRes.data ?? []) as FinanceBill[],
    transactions: txRes,
    incomeSources: (incomeRes.data ?? []) as FinanceIncomeSource[],
    snapshots: ((snapshotsRes.data ?? []) as FinanceSnapshot[]).reverse(),
  };
}

export function useFinanceBundle(userId: string | undefined) {
  const [monthKey, setMonthKey] = useState(() => getTodayWarsaw().slice(0, 7));

  useEffect(() => {
    const handleSync = () => {
      const current = getTodayWarsaw().slice(0, 7);
      setMonthKey((prev) => (prev !== current ? current : prev));
    };
    document.addEventListener('visibilitychange', handleSync);
    window.addEventListener('focus', handleSync);
    return () => {
      document.removeEventListener('visibilitychange', handleSync);
      window.removeEventListener('focus', handleSync);
    };
  }, []);

  return useQuery({
    queryKey: [...financeKeys.bundle(userId ?? ''), monthKey],
    queryFn: () => fetchFinanceBundle(userId!, monthKey),
    enabled: !!userId,
  });
}

export function sumAccountBalances(accounts: FinanceAccount[]): { netWorth: number; liquid: number; investments: number } {
  let liquid = 0;
  let investments = 0;
  for (const a of accounts) {
    if (a.is_liquid) liquid += a.balance;
    else investments += a.balance;
  }
  return { netWorth: liquid + investments, liquid, investments };
}

export { useFinanceMutations } from './financeMutations';
