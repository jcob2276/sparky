import { shiftDateStr } from '../../lib/date';
import type { FinanceTransaction } from '../../lib/financeApi';

export function moveFinanceMonth(month: string, offset: number): string {
  const [year, number] = month.split('-').map(Number);
  return new Date(Date.UTC(year, number - 1 + offset, 1)).toISOString().slice(0, 7);
}

export function movement(tx: FinanceTransaction) {
  return tx.flow_kind ?? tx.kind;
}

export function financePeriodTotals(transactions: FinanceTransaction[]) {
  let income = 0;
  let expenses = 0;
  let refunds = 0;
  const categories = new Map<string, number>();
  for (const tx of transactions) {
    const amount = Math.abs(tx.amount);
    switch (movement(tx)) {
      case 'income': income += amount; break;
      case 'refund': refunds += amount; break;
      case 'expense':
        expenses += amount;
        categories.set(tx.category, (categories.get(tx.category) ?? 0) + amount);
        break;
    }
  }
  return { income, expenses, refunds, balance: income + refunds - expenses, categories };
}

export interface FinanceDateRange {
  from: string;
  to: string;
}

export function financeRecordsInRange(transactions: FinanceTransaction[], range: FinanceDateRange) {
  return transactions.filter((tx) => tx.transaction_date >= range.from && tx.transaction_date <= range.to);
}

export type FinancePeriod = 'week' | 'month' | 'year';

export function financePeriodBounds(today: string, scale: FinancePeriod, offset: number): [string, string] {
  if (scale === 'week') {
    const day = new Date(`${today}T12:00:00Z`).getUTCDay();
    const start = shiftDateStr(today, -((day + 6) % 7) - offset * 7);
    return [start, shiftDateStr(start, 6)];
  }
  if (scale === 'year') {
    const year = Number(today.slice(0, 4)) - offset;
    return [`${year}-01-01`, `${year}-12-31`];
  }
  const month = moveFinanceMonth(today.slice(0, 7), -offset);
  return [`${month}-01`, shiftDateStr(`${moveFinanceMonth(month, 1)}-01`, -1)];
}
