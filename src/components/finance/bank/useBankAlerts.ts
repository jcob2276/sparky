import { useMemo } from 'react';
import { computeFinanceAlerts, type FinanceAlert } from '@vanguard/domain';
import type { BankData } from '../../../lib/finance/bankApi';
import type { CategoryBudgets } from '../../../lib/finance/categoryBudgetsApi';
import { getTodayWarsaw } from '../../../lib/date';

/** Alerty z danych banku (PLN) i limitów kopert; puste, gdy nic nie wymaga uwagi. */
export function useBankAlerts(data: BankData | undefined, budgets: CategoryBudgets): FinanceAlert[] {
  return useMemo(() => (data?.accounts.length
    ? computeFinanceAlerts({ today: getTodayWarsaw(), accounts: data.accounts, transactions: data.transactions, budgets })
    : []), [data, budgets]);
}
