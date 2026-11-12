import type { FinanceTransaction } from '../financeApi';
import { shiftDateStr } from '../date';

export interface MonthlyFlow {
  /** "YYYY-MM" */
  month: string;
  income: number;
  expense: number;
}

type Tx = Pick<FinanceTransaction, 'amount' | 'kind' | 'transaction_date'> & { flow_kind?: FinanceTransaction['flow_kind'] };

function monthKeys(today: string, months: number): string[] {
  const keys: string[] = [];
  let cursor = `${today.slice(0, 7)}-01`;
  for (let i = 0; i < months; i += 1) {
    keys.unshift(cursor.slice(0, 7));
    cursor = shiftDateStr(cursor, -1).slice(0, 7) + '-01';
  }
  return keys;
}

/**
 * Income and spending per calendar month for the last `months` months, ending with the current one.
 * Same definitions as the month card on Pulpit: refunds are not income, nothing after today counts.
 */
export function buildMonthlyFlows(transactions: Tx[], today: string, months = 6): MonthlyFlow[] {
  const rows = new Map(monthKeys(today, months).map((month) => [month, { month, income: 0, expense: 0 }]));
  for (const tx of transactions) {
    if (tx.transaction_date > today) continue;
    const row = rows.get(tx.transaction_date.slice(0, 7));
    if (!row) continue;
    if (tx.kind === 'expense') row.expense += Math.abs(tx.amount);
    else if (tx.kind === 'income' && tx.flow_kind !== 'refund') row.income += Math.abs(tx.amount);
  }
  return [...rows.values()];
}

/** Average over months that actually have data, so a month before the first entry does not drag the average to zero. */
export function averageFlows(flows: MonthlyFlow[]): { income: number; expense: number; months: number } {
  const active = flows.filter((flow) => flow.income > 0 || flow.expense > 0);
  if (!active.length) return { income: 0, expense: 0, months: 0 };
  return {
    income: active.reduce((sum, flow) => sum + flow.income, 0) / active.length,
    expense: active.reduce((sum, flow) => sum + flow.expense, 0) / active.length,
    months: active.length,
  };
}
