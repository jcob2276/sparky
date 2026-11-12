import { shiftDateStr } from '../date';

type SpendingRow = { transaction_date: string; kind: string; amount: number };

/** Compare equal elapsed calendar windows; missing history stays unknown. */
export function compareSpending(rows: readonly SpendingRow[], today: string) {
  const monthStart = `${today.slice(0, 7)}-01`;
  const previousEnd = shiftDateStr(monthStart, -1);
  const previousStart = `${previousEnd.slice(0, 7)}-01`;
  const cutoff = `${previousEnd.slice(0, 7)}-${String(Math.min(Number(today.slice(8)), Number(previousEnd.slice(8)))).padStart(2, '0')}`;
  const expenses = rows.filter(row => row.kind === 'expense');
  const total = (start: string, end: string) => expenses.filter(row => row.transaction_date >= start && row.transaction_date <= end).reduce((sum, row) => sum + Math.abs(row.amount), 0);
  const current = total(monthStart, today);
  const hasPrevious = rows.some(row => row.transaction_date >= previousStart && row.transaction_date <= cutoff);
  const previous = hasPrevious ? total(previousStart, cutoff) : null;
  const difference = previous == null ? null : current - previous;
  return { current, previous, difference, percent: previous && difference != null ? difference / previous * 100 : null };
}

export function simulatePurchase(plan: number, spent: number, purchase: number, days: number) {
  const remaining = Math.round((plan - spent - Math.max(0, purchase)) * 100) / 100;
  return { remaining, daily: Math.max(0, remaining) / Math.max(1, days), overBudget: remaining < 0 };
}
