import {
  FINANCE_ACCOUNT_LABELS,
  HOLDING_ASSET_LABELS,
  type FinanceAccountType,
  type ValuedHolding,
} from '@vanguard/domain';
import type { FinanceAccount } from '../financeApi';

export interface AllocationSliceItem {
  key: string;
  label: string;
  amount: number;
  pct: number;
}

export function buildAllocationSlices(accounts: FinanceAccount[], holdings: ValuedHolding[]): AllocationSliceItem[] {
  const totals = new Map<string, { label: string; amount: number }>();
  const add = (key: string, label: string, amount: number) => {
    if (amount <= 0) return;
    const current = totals.get(key);
    totals.set(key, { label, amount: (current?.amount ?? 0) + amount });
  };
  for (const account of accounts) {
    const label = FINANCE_ACCOUNT_LABELS[account.account_type as FinanceAccountType] ?? account.account_type;
    add(`account:${account.account_type}`, label, account.balance);
  }
  for (const holding of holdings) {
    add(`holding:${holding.assetClass}`, HOLDING_ASSET_LABELS[holding.assetClass], holding.valuePln);
  }
  const sum = [...totals.values()].reduce((acc, item) => acc + item.amount, 0);
  if (sum <= 0) return [];
  return [...totals.entries()]
    .map(([key, item]) => ({ key, label: item.label, amount: item.amount, pct: (item.amount / sum) * 100 }))
    .sort((a, b) => b.amount - a.amount);
}
